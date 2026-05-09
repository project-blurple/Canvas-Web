import express from "express";
import request from "supertest";
import { isCanvasAdmin } from "@/services/discordGuildService";
import {
  assignColorToEvent,
  createColor,
  deleteColor,
  editColor,
  unassignColorFromEvent,
} from "@/services/paletteService";
import { paletteRouter } from "./palette";

vi.mock("@/services/paletteService", () => ({
  assignColorToEvent: vi.fn(),
  createColor: vi.fn(),
  deleteColor: vi.fn(),
  editColor: vi.fn(),
  getCurrentEventPalette: vi.fn(),
  getEventPalette: vi.fn(),
  unassignColorFromEvent: vi.fn(),
}));

vi.mock("@/services/discordGuildService", () => ({
  isCanvasAdmin: vi.fn(),
  isCanvasModerator: vi.fn(),
}));

const createPaletteApp = () => {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = { isCanvasAdmin: true } as Express.User;
    req.session = {
      discordAccessToken: "test-access-token",
    } as typeof req.session;
    next();
  });
  app.use("/api/v1/palette", paletteRouter);
  return app;
};

describe("Palette admin route tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a color", async () => {
    vi.mocked(isCanvasAdmin).mockResolvedValueOnce(true);
    const app = createPaletteApp();
    vi.mocked(createColor).mockResolvedValueOnce({
      id: 1,
      code: "pink",
      name: "Pink",
      global: true,
      rgba: [255, 0, 255, 255],
      emoji_name: null,
      emoji_id: null,
    } as Awaited<ReturnType<typeof createColor>>);

    const response = await request(app)
      .post("/api/v1/palette/")
      .send({
        code: "pink",
        name: "Pink",
        global: true,
        rgba: [255, 0, 255, 255],
      });

    expect(response.status).toBe(201);
    expect(response.body).toStrictEqual({
      message: "Color created",
    });
    expect(vi.mocked(createColor)).toHaveBeenCalledWith({
      code: "pink",
      name: "Pink",
      global: true,
      rgba: [255, 0, 255, 255],
    });
  });

  it("edits a color", async () => {
    vi.mocked(isCanvasAdmin).mockResolvedValueOnce(true);
    const app = createPaletteApp();
    vi.mocked(editColor).mockResolvedValueOnce({
      id: 3,
      code: "gren",
      name: "Green",
      global: false,
      rgba: [0, 255, 0, 255],
      emoji_name: null,
      emoji_id: null,
    } as Awaited<ReturnType<typeof editColor>>);

    const response = await request(app)
      .put("/api/v1/palette/3")
      .send({
        code: "gren",
        name: "Green",
        global: false,
        rgba: [0, 255, 0, 255],
      });

    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual({
      message: "Color edited",
    });
    expect(vi.mocked(editColor)).toHaveBeenCalledWith({
      colorId: 3,
      data: {
        code: "gren",
        name: "Green",
        global: false,
        rgba: [0, 255, 0, 255],
      },
    });
  });

  it("deletes a color", async () => {
    vi.mocked(isCanvasAdmin).mockResolvedValueOnce(true);
    const app = createPaletteApp();
    vi.mocked(deleteColor).mockResolvedValueOnce(undefined);

    const response = await request(app).delete("/api/v1/palette/5");

    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual({
      message: "Color deleted",
    });
    expect(vi.mocked(deleteColor)).toHaveBeenCalledWith(5);
  });

  it("assigns a color to an event", async () => {
    vi.mocked(isCanvasAdmin).mockResolvedValueOnce(true);
    const app = createPaletteApp();
    vi.mocked(assignColorToEvent).mockResolvedValueOnce(undefined);

    const response = await request(app).post(
      "/api/v1/palette/8/assign/13/123456789012345678",
    );

    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual({
      message: "Color assigned to event",
    });
    expect(vi.mocked(assignColorToEvent)).toHaveBeenCalledWith({
      colorId: 8,
      eventId: 13,
      guildId: 123456789012345678n,
    });
  });

  it("unassigns a color from an event", async () => {
    vi.mocked(isCanvasAdmin).mockResolvedValueOnce(true);
    const app = createPaletteApp();
    vi.mocked(unassignColorFromEvent).mockResolvedValueOnce(undefined);

    const response = await request(app).delete(
      "/api/v1/palette/8/assign/13/123456789012345678",
    );

    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual({
      message: "Color unassigned from event",
    });
    expect(vi.mocked(unassignColorFromEvent)).toHaveBeenCalledWith({
      eventId: 13,
      guildId: 123456789012345678n,
    });
  });
});
