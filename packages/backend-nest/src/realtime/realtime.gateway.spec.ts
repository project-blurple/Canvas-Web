import { Test, type TestingModule } from "@nestjs/testing";
import type { Socket } from "socket.io";

import { DatabaseModule } from "@/common/database/database.module";
import { AppConfigModule } from "@/config/config.module";
import { BroadcastService } from "@/realtime/broadcast.service";
import { RealtimeGateway } from "@/realtime/realtime.gateway";
import { RealtimeModule } from "@/realtime/realtime.module";
import { testPrisma } from "@/test/database";
import { seedCanvases } from "@/test/seed/canvases";
import { seedColors } from "@/test/seed/colors";
import { seedEvents } from "@/test/seed/events";
import { seedUsers } from "@/test/seed/users";

const MINUTE_IN_MS = 60 * 1000;

function fakeSocket(
  auth: Record<string, unknown>,
  { recovered = false } = {},
): Socket {
  return {
    id: "socket-1",
    recovered,
    handshake: { auth },
  } as unknown as Socket;
}

async function seedRecentHistory() {
  const fiveMinutesAgo = new Date(Date.now() - 5 * MINUTE_IN_MS);
  await testPrisma.history.createMany({
    data: [
      // Missed pixels on canvas 1 that a resync should replay.
      {
        canvasId: 1,
        userId: 1,
        x: 0,
        y: 0,
        colorId: 2,
        timestamp: fiveMinutesAgo,
      },
      {
        canvasId: 1,
        userId: 1,
        x: 1,
        y: 1,
        colorId: 3,
        timestamp: fiveMinutesAgo,
      },
      // Erased pixel: must not be replayed.
      {
        canvasId: 1,
        userId: 1,
        x: 1,
        y: 0,
        colorId: 4,
        timestamp: fiveMinutesAgo,
        erasedAt: new Date(),
      },
      // Pixel older than the client's timestamp: already received.
      {
        canvasId: 1,
        userId: 1,
        x: 0,
        y: 1,
        colorId: 4,
        timestamp: new Date(Date.now() - 20 * MINUTE_IN_MS),
      },
      // Pixel on another canvas: out of scope.
      {
        canvasId: 9,
        userId: 1,
        x: 0,
        y: 0,
        colorId: 2,
        timestamp: fiveMinutesAgo,
      },
    ],
  });
}

describe("RealtimeGateway resync", () => {
  let moduleRef: TestingModule;
  let gateway: RealtimeGateway;
  let broadcast: BroadcastService;

  // No PrismaService override: the test harness (src/test/database.ts)
  // transparently backs every PrismaService with the per-test transaction.
  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppConfigModule, DatabaseModule, RealtimeModule],
    }).compile();
    await moduleRef.init();

    gateway = moduleRef.get(RealtimeGateway);
    broadcast = moduleRef.get(BroadcastService);
    vi.spyOn(broadcast, "broadcastPixelsBulk");
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  beforeEach(async () => {
    vi.clearAllMocks();

    await seedEvents();
    await seedUsers();
    await seedCanvases();
    await seedColors();
  });

  it("replays exactly the missed non-erased pixels for a 9-minute-old timestamp", async () => {
    await seedRecentHistory();
    const pixelTimestamp = new Date(
      Date.now() - 9 * MINUTE_IN_MS,
    ).toISOString();

    await gateway.handleConnection(fakeSocket({ canvasId: 1, pixelTimestamp }));

    expect(broadcast.broadcastPixelsBulk).toHaveBeenCalledTimes(1);
    const [canvasId, payload] = vi.mocked(broadcast.broadcastPixelsBulk).mock
      .calls[0];
    expect(canvasId).toBe(1);
    // The replay order is unspecified (the query has no ORDER BY).
    expect(payload.pixels).toHaveLength(2);
    expect(payload.pixels).toEqual(
      expect.arrayContaining([
        { x: 0, y: 0, rgba: [88, 101, 242, 255] },
        { x: 1, y: 1, rgba: [234, 35, 40, 255] },
      ]),
    );
  });

  it("does not resync for an 11-minute-old timestamp", async () => {
    await seedRecentHistory();
    const pixelTimestamp = new Date(
      Date.now() - 11 * MINUTE_IN_MS,
    ).toISOString();

    await gateway.handleConnection(fakeSocket({ canvasId: 1, pixelTimestamp }));

    expect(broadcast.broadcastPixelsBulk).not.toHaveBeenCalled();
  });

  it("skips the resync when the socket recovered automatically", async () => {
    await seedRecentHistory();
    const pixelTimestamp = new Date(
      Date.now() - 9 * MINUTE_IN_MS,
    ).toISOString();

    await gateway.handleConnection(
      fakeSocket({ canvasId: 1, pixelTimestamp }, { recovered: true }),
    );

    expect(broadcast.broadcastPixelsBulk).not.toHaveBeenCalled();
  });

  it("skips the resync when the handshake carries no canvas or timestamp", async () => {
    await seedRecentHistory();

    await gateway.handleConnection(fakeSocket({}));

    expect(broadcast.broadcastPixelsBulk).not.toHaveBeenCalled();
  });

  it("does not broadcast an empty bulk event when nothing was missed", async () => {
    const pixelTimestamp = new Date(
      Date.now() - 9 * MINUTE_IN_MS,
    ).toISOString();

    await gateway.handleConnection(fakeSocket({ canvasId: 1, pixelTimestamp }));

    expect(broadcast.broadcastPixelsBulk).not.toHaveBeenCalled();
  });
});
