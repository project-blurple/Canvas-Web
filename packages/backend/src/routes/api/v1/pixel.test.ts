import express from "express";
import request from "supertest";

import seedAll from "@/test";
import { mockAuth } from "@/test/mockAuth";

vi.mock("@/index", () => ({
  socketHandler: {
    broadcastPixelPlacement: vi.fn(),
  },
}));

import { pixelRouter } from "./pixel";

let app: express.Express;

describe("Place Pixel Tests", () => {
  beforeEach(async () => {
    await seedAll();
    vi.useFakeTimers();

    app = express();
    app.use(express.json());
    app.use(mockAuth);
    app.use("/api/v1/canvas/:canvasId/pixel", pixelRouter);
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
      })
      .type("json")
      .set("X-TestUserId", "1");

    expect(response.body).toStrictEqual({
      cooldownEndTime: 30 * 1000,
    });
    expect(response.status).toBe(201);
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
        })
        .type("json")
        .set("X-TestUserId", "1");
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
