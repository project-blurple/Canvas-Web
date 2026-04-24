import express from "express";
import request from "supertest";

import { canvasRouter } from "./canvas";
import { eventRouter } from "./event";
import { paletteRouter } from "./palette";

vi.mock("@/index", () => ({
  socketHandler: {
    broadcastPixelPlacement: vi.fn(),
  },
}));

const mocks = vi.hoisted(() => ({
  assertLoggedIn: vi.fn(),
  assertCanvasAdmin: vi.fn(),
  createEvent: vi.fn(),
  editEvent: vi.fn(),
  createCanvas: vi.fn(),
  editCanvas: vi.fn(),
  createColor: vi.fn(),
  editColor: vi.fn(),
  deleteColor: vi.fn(),
  assignColorToEvent: vi.fn(),
  unassignColorFromEvent: vi.fn(),
}));

vi.mock("@/utils", () => ({
  assertLoggedIn: mocks.assertLoggedIn,
}));

vi.mock("@/services/discordGuildService", () => ({
  assertCanvasAdmin: mocks.assertCanvasAdmin,
}));

vi.mock("@/services/eventService", () => ({
  createEvent: mocks.createEvent,
  editEvent: mocks.editEvent,
  getCurrentEvent: vi.fn(),
  getEventById: vi.fn(),
}));

vi.mock("@/services/canvasService", () => ({
  createCanvas: mocks.createCanvas,
  editCanvas: mocks.editCanvas,
  getCanvases: vi.fn(),
  getCanvasFilename: vi.fn(),
  getCanvasInfo: vi.fn(),
  getCanvasPng: vi.fn(),
  getCurrentCanvas: vi.fn(),
  getCurrentCanvasInfo: vi.fn(),
  unlockedCanvasToPng: vi.fn(),
}));

vi.mock("@/services/paletteService", () => ({
  assignColorToEvent: mocks.assignColorToEvent,
  createColor: mocks.createColor,
  deleteColor: mocks.deleteColor,
  editColor: mocks.editColor,
  getCurrentEventPalette: vi.fn(),
  getEventPalette: vi.fn(),
  unassignColorFromEvent: mocks.unassignColorFromEvent,
}));

let app: express.Express;

describe("Admin route tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.assertLoggedIn.mockImplementation(() => undefined);
    mocks.assertCanvasAdmin.mockImplementation(() => undefined);

    app = express();
    app.use(express.json());
    app.use("/api/v1/event", eventRouter);
    app.use("/api/v1/canvas", canvasRouter);
    app.use("/api/v1/palette", paletteRouter);
  });

  describe("event routes", () => {
    it("creates an event", async () => {
      const response = await request(app).post("/api/v1/event/").send({
        id: 42,
        name: "Spring Event",
      });

      expect(response.status).toBe(201);
      expect(response.body).toStrictEqual({
        message: "Event created successfully",
      });
      expect(mocks.createEvent).toHaveBeenCalledWith("Spring Event", 42);
    });

    it("edits an event", async () => {
      const response = await request(app).put("/api/v1/event/42").send({
        name: "Updated Event",
      });

      expect(response.status).toBe(200);
      expect(response.body).toStrictEqual({
        message: "Event edited successfully",
      });
      expect(mocks.editEvent).toHaveBeenCalledWith(42, "Updated Event");
    });
  });

  describe("canvas routes", () => {
    it("creates a canvas", async () => {
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
      expect(mocks.createCanvas).toHaveBeenCalledWith({
        name: "New Canvas",
        width: 16,
        height: 16,
        startCoordinates: [1, 1],
        allColorsGlobal: true,
        cooldownLength: 30,
      });
    });

    it("edits a canvas", async () => {
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
      expect(mocks.editCanvas).toHaveBeenCalledWith({
        canvasId: 7,
        name: "Updated Canvas",
        allColorsGlobal: false,
        cooldownLength: 45,
        isLocked: true,
      });
    });
  });

  describe("palette routes", () => {
    it("creates a color", async () => {
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
        message: "Color created successfully",
      });
      expect(mocks.createColor).toHaveBeenCalledWith({
        code: "pink",
        name: "Pink",
        global: true,
        rgba: [255, 0, 255, 255],
      });
    });

    it("edits a color", async () => {
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
        message: "Color edited successfully",
      });
      expect(mocks.editColor).toHaveBeenCalledWith({
        colorId: 3,
        code: "gren",
        name: "Green",
        global: false,
        rgba: [0, 255, 0, 255],
      });
    });

    it("deletes a color", async () => {
      const response = await request(app).delete("/api/v1/palette/5");

      expect(response.status).toBe(200);
      expect(response.body).toStrictEqual({
        message: "Color deleted successfully",
      });
      expect(mocks.deleteColor).toHaveBeenCalledWith(5);
    });

    it("assigns a color to an event", async () => {
      const response = await request(app).post(
        "/api/v1/palette/8/assign/13/123456789012345678",
      );

      expect(response.status).toBe(200);
      expect(response.body).toStrictEqual({
        message: "Color assigned to event successfully",
      });
      expect(mocks.assignColorToEvent).toHaveBeenCalledWith({
        colorId: 8,
        eventId: 13,
        guildId: 123456789012345678n,
      });
    });

    it("unassigns a color from an event", async () => {
      const response = await request(app).delete(
        "/api/v1/palette/8/assign/13/123456789012345678",
      );

      expect(response.status).toBe(200);
      expect(response.body).toStrictEqual({
        message: "Color unassigned from event successfully",
      });
      expect(mocks.unassignColorFromEvent).toHaveBeenCalledWith({
        eventId: 13,
        guildId: 123456789012345678n,
      });
    });
  });
});
