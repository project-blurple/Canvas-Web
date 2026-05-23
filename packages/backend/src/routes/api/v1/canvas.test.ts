import express from "express";
import request from "supertest";
import { errorHandler } from "@/middleware/errorHandler";
import {
  clearCachedCanvas,
  createCanvas,
  editCanvas,
} from "@/services/canvasService";
import { isCanvasAdmin } from "@/services/discordGuildService";
import { canvasRouter } from "./canvas";

vi.mock("@/index", () => ({
  socketHandler: {
    broadcastPixelPlacement: vi.fn(),
  },
}));

vi.mock("@/services/canvasService", () => ({
  clearCachedCanvas: vi.fn(),
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

vi.mock("@/services/discordGuildService", () => ({
  isCanvasAdmin: vi.fn(),
  isCanvasModerator: vi.fn(),
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
  app.use(errorHandler);
  return app;
};

describe("Canvas admin route tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a canvas", async () => {
    vi.mocked(isCanvasAdmin).mockResolvedValueOnce(true);
    const app = createApp();
    vi.mocked(createCanvas).mockResolvedValueOnce({
      id: 9,
      name: "New Canvas",
      width: 16,
      height: 16,
      start_coordinates: [1, 1],
      locked: true,
      event_id: 1,
      cooldown_length: 30,
      all_colors_global: true,
    });

    const response = await request(app)
      .post("/api/v1/canvas/")
      .send({
        name: "New Canvas",
        width: 16,
        height: 16,
        startCoordinates: [1, 1],
        allColorsGlobal: true,
        cooldownDuration: 30,
      });

    expect(response.status).toBe(201);
    expect(response.body).toStrictEqual({
      id: 9,
      name: "New Canvas",
      width: 16,
      height: 16,
      start_coordinates: [1, 1],
      locked: true,
      event_id: 1,
      cooldown_length: 30,
      all_colors_global: true,
    });
    expect(vi.mocked(createCanvas)).toHaveBeenCalledWith({
      name: "New Canvas",
      width: 16,
      height: 16,
      startCoordinates: [1, 1],
      allColorsGlobal: true,
      cooldownDuration: 30,
    });
  });

  it("edits a canvas", async () => {
    vi.mocked(isCanvasAdmin).mockResolvedValueOnce(true);
    const app = createApp();
    vi.mocked(editCanvas).mockResolvedValueOnce({
      id: 7,
      name: "Updated Canvas",
      width: 32,
      height: 32,
      start_coordinates: [1, 1],
      locked: true,
      event_id: 1,
      cooldown_length: 45,
      all_colors_global: false,
    });

    const response = await request(app).put("/api/v1/canvas/7").send({
      name: "Updated Canvas",
      allColorsGlobal: false,
      cooldownDuration: 45,
      isLocked: true,
    });

    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual({
      id: 7,
      name: "Updated Canvas",
      width: 32,
      height: 32,
      start_coordinates: [1, 1],
      locked: true,
      event_id: 1,
      cooldown_length: 45,
      all_colors_global: false,
    });
    expect(vi.mocked(editCanvas)).toHaveBeenCalledWith({
      canvasId: 7,
      name: "Updated Canvas",
      cooldownDuration: 45,
      isLocked: true,
      allColorsGlobal: false,
    });
  });

  it("clears cached canvas by ID", async () => {
    vi.mocked(isCanvasAdmin).mockResolvedValueOnce(true);
    const app = createApp();

    const response = await request(app).delete("/api/v1/canvas/7/cache");

    expect(response.status).toBe(204);
    expect(response.body).toStrictEqual({});
    expect(vi.mocked(clearCachedCanvas)).toHaveBeenCalledWith(7);
  });
});
