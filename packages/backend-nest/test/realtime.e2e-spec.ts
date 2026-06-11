import type { AddressInfo } from "node:net";
import { type PlacePixelSocket, SocketEvents } from "@blurple-canvas-web/types";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import { io, type Socket } from "socket.io-client";

import { AppModule } from "@/app.module";
import { configureApp } from "@/app.setup";
import { BroadcastService } from "@/realtime/broadcast.service";
import { testPrisma } from "@/test/database";
import { seedAll } from "@/test/seed";

describe("Realtime gateway (e2e)", () => {
  let app: NestExpressApplication;
  let baseUrl: string;
  let broadcast: BroadcastService;
  const clients: Socket[] = [];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = configureApp(
      moduleRef.createNestApplication<NestExpressApplication>(),
    );
    // The gateway needs a listening HTTP server for real socket connections.
    await app.listen(0);
    const { port } = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}`;
    broadcast = app.get(BroadcastService);
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    for (const client of clients.splice(0)) {
      client.disconnect();
    }
  });

  function createClient(auth: Record<string, unknown> = {}): Socket {
    const client = io(baseUrl, { auth });
    clients.push(client);
    return client;
  }

  function connected(client: Socket): Promise<void> {
    return new Promise((resolve, reject) => {
      client.once("connect", () => resolve());
      client.once("connect_error", reject);
    });
  }

  function waitForEvent<T>(client: Socket, event: string): Promise<T> {
    return new Promise((resolve) => {
      client.once(event, (payload: T) => resolve(payload));
    });
  }

  it("fans broadcasts out to connected clients", async () => {
    const client = createClient();
    await connected(client);

    const payload: PlacePixelSocket.Payload = {
      x: 1,
      y: 2,
      rgba: [88, 101, 242, 255],
    };
    const received = waitForEvent(client, SocketEvents.placePixel(1));

    broadcast.broadcastPixel(1, payload);

    await expect(received).resolves.toEqual(payload);
  });

  it("emits canvas and notice updates under their fixed event names", async () => {
    const client = createClient();
    await connected(client);

    const canvasUpdate = waitForEvent(client, SocketEvents.canvasUpdate);
    const noticeUpdate = waitForEvent(client, SocketEvents.noticeUpdate);

    broadcast.broadcastNoticeUpdate();
    await expect(noticeUpdate).resolves.toBeUndefined();

    const canvasInfo = { id: 1, name: "Canvas" };
    broadcast.broadcastCanvasInfo(canvasInfo as never);
    await expect(canvasUpdate).resolves.toEqual(canvasInfo);
  });

  it("replays missed pixels to a reconnecting client within the resync window", async () => {
    await seedAll();
    await testPrisma.history.create({
      data: {
        canvasId: 1,
        userId: 1,
        x: 1,
        y: 1,
        colorId: 2,
        timestamp: new Date(),
      },
    });

    const client = createClient({
      canvasId: 1,
      pixelTimestamp: new Date(Date.now() - 60 * 1000).toISOString(),
    });
    const bulk = waitForEvent(client, SocketEvents.placePixelBulk(1));

    await expect(bulk).resolves.toEqual({
      pixels: [{ x: 1, y: 1, rgba: [88, 101, 242, 255] }],
    });
  });
});
