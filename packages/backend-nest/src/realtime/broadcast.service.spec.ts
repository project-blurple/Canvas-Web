import type { CanvasInfo, PlacePixelSocket } from "@blurple-canvas-web/types";
import { Test, type TestingModule } from "@nestjs/testing";
import type { Server } from "socket.io";

import { BroadcastService } from "@/realtime/broadcast.service";

describe("BroadcastService", () => {
  let moduleRef: TestingModule;
  let service: BroadcastService;
  let emit: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [BroadcastService],
    }).compile();
    service = moduleRef.get(BroadcastService);

    emit = vi.fn();
    service.attachServer({ emit } as unknown as Server);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it("emits pixel placements under the per-canvas event name", () => {
    const payload: PlacePixelSocket.Payload = {
      x: 1,
      y: 2,
      rgba: [88, 101, 242, 255],
    };

    service.broadcastPixel(7, payload);

    expect(emit).toHaveBeenCalledExactlyOnceWith("place pixel 7", payload);
  });

  it("emits bulk placements under the per-canvas bulk event name", () => {
    const payload: PlacePixelSocket.BulkPayload = {
      pixels: [{ x: 0, y: 0, rgba: [0, 0, 0, 255] }],
    };

    service.broadcastPixelsBulk(7, payload);

    expect(emit).toHaveBeenCalledExactlyOnceWith("place pixel bulk 7", payload);
  });

  it("emits canvas info updates", () => {
    const canvasInfo = { id: 1, name: "Canvas" } as CanvasInfo;

    service.broadcastCanvasInfo(canvasInfo);

    expect(emit).toHaveBeenCalledExactlyOnceWith("canvas update", canvasInfo);
  });

  it("emits notice updates without a payload", () => {
    service.broadcastNoticeUpdate();

    expect(emit).toHaveBeenCalledExactlyOnceWith("notice update");
  });

  it("drops broadcasts silently before the gateway attaches the server", async () => {
    const detachedModule = await Test.createTestingModule({
      providers: [BroadcastService],
    }).compile();
    const detached = detachedModule.get(BroadcastService);

    expect(() => detached.broadcastNoticeUpdate()).not.toThrow();
    expect(emit).not.toHaveBeenCalled();

    await detachedModule.close();
  });
});
