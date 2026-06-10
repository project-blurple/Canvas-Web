import express from "express";
import request from "supertest";

import { errorHandler } from "@/middleware/errorHandler";
import seedAll from "@/test";
import { mockAuth } from "@/test/mockAuth";

vi.mock("@/services/turnstileService", () => ({
  verifyTurnstileToken: vi.fn(async () => {}),
}));

vi.mock("@/index", () => ({
  socketHandler: {
    broadcastPixelPlacement: vi.fn(),
  },
}));

import { verifyTurnstileToken } from "@/services/turnstileService";
import { pixelRouter } from "./pixel";

let app: express.Express;

describe("Place Pixel Tests", () => {
  beforeEach(async () => {
    await seedAll();
    // We only mock Date, not timers. `router` from Express uses setImmediate to
    // hand control back to a parent router when no more layers match, so
    // faking setImmediate would deadlock requests whose errors propagate
    // out of pixelRouter into the global errorHandler.
    vi.useFakeTimers({ toFake: ["Date"] });

    app = express();
    app.use(express.json());
    app.use(mockAuth);
    app.use("/api/v1/canvas/:canvasId/pixel", pixelRouter);
    app.use(errorHandler);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("Pixel is placed with valid user", async () => {
    vi.setSystemTime(new Date(0));
    const response = await request(app)
      .post("/api/v1/canvas/1/pixel")
      .send({
        x: 1,
        y: 1,
        colorId: 1,
        turnstileToken: "test-turnstile-token",
      })
      .type("json")
      .set("Test-User-Id", "1");

    expect(response.body).toStrictEqual({
      cooldownEndTime: 30 * 1000,
    });
    expect(response.status).toBe(201);
    expect(vi.mocked(verifyTurnstileToken)).toHaveBeenCalledWith(
      "test-turnstile-token",
    );
  });

  it("Only allows one pixel to be placed at a time", async () => {
    const dateTime = new Date(0);
    vi.setSystemTime(dateTime);
    const endpointRequest = async () => {
      return request(app)
        .post("/api/v1/canvas/1/pixel")
        .send({
          x: 1,
          y: 1,
          colorId: 1,
          turnstileToken: "test-turnstile-token",
        })
        .type("json")
        .set("Test-User-Id", "1");
    };

    const firstResponse = await endpointRequest();
    const promises = [];
    const iterations = 2;
    for (let index = 0; index < iterations; index++) {
      promises[index] = endpointRequest();
    }
    const responses = await Promise.all(promises);
    expect(firstResponse.status).toBe(201);
    for (let index = 0; index < iterations; index++) {
      expect([403, 429]).toContain(responses[index].status);
    }
  });
});
