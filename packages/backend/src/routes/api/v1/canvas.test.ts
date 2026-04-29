import express from "express";
import request from "supertest";

import { createCanvas, editCanvas } from "@/services/canvasService";
import { canvasRouter } from "./canvas";

vi.mock("@/index", () => ({
  socketHandler: {
    broadcastPixelPlacement: vi.fn(),
  },
}));

vi.mock("@/services/canvasService", () => ({
  createCanvas: vi.fn(),
  editCanvas: vi.fn(),
  getCanvases: vi.fn(),
  getCanvasFilename: vi.fn(),
  getCanvasInfo: vi.fn(),
  getCanvasPng: vi.fn(),
  getCurrentCanvas: vi.fn(),
  getCurrentCanvasInfo: vi.fn(),
  unlockedCanvasToPng: vi.fn(),
}));

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = { isCanvasAdmin: true } as Express.User;
    req.session = {
      discordAccessToken: "test-access-token",
    } as typeof req.session;
    next();
  });
  app.use("/api/v1/canvas", canvasRouter);
  return app;
};

describe("Canvas admin route tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a canvas", async () => {
    const app = createApp();
    vi.mocked(createCanvas).mockResolvedValueOnce(undefined);

    const response = await request(app)
      .post("/api/v1/canvas/")
      .send({
        name: "New Canvas",
        width: 16,
        height: 16,
        startCoordinates: [1, 1],
        allColorsGlobal: true,
        cooldownLength: 30,
      });

    expect(response.status).toBe(201);
    expect(response.body).toStrictEqual({
      message: "Canvas created successfully",
    });
    expect(vi.mocked(createCanvas)).toHaveBeenCalledWith({
      name: "New Canvas",
      width: 16,
      height: 16,
      startCoordinates: [1, 1],
      cooldownLength: 30,
    });
  });

  it("edits a canvas", async () => {
    const app = createApp();
    vi.mocked(editCanvas).mockResolvedValueOnce(undefined);

    const response = await request(app).put("/api/v1/canvas/7").send({
      name: "Updated Canvas",
      allColorsGlobal: false,
      cooldownLength: 45,
      isLocked: true,
    });

    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual({
      message: "Canvas edited successfully",
    });
    expect(vi.mocked(editCanvas)).toHaveBeenCalledWith({
      canvasId: 7,
      name: "Updated Canvas",
      cooldownLength: 45,
      isLocked: true,
    });
  });
});
