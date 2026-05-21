import { prisma } from "@/client";
import { NotFoundError } from "@/errors";
import { socketHandler } from "@/index";
import { seedCanvases, seedColors, seedEvents, seedPixels } from "@/test";
import {
  createCanvas,
  editCanvas,
  getCanvases,
  getCanvasInfo,
  getCanvasPixels,
  pasteCanvasData,
} from "./canvasService";

vi.mock("./historyService", () => ({
  createBulkHistoryEntries: vi.fn(),
}));

vi.mock("./paletteService", () => ({
  getEventPalette: vi.fn(),
}));

import { getEventPalette } from "./paletteService";
import { createBulkPlaceEntries } from "./pixelService";

vi.mock("@/index", () => ({
  socketHandler: {
    broadcastCanvasUpdate: vi.fn(),
    broadcastPixelPlacement: vi.fn(),
  },
}));

describe("Canvas Info Tests", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await seedEvents();
    await seedCanvases();
  });

  it("Gets canvases", async () => {
    expect((await getCanvases()).length).toBe(2);
  });

  it("Gets summary of canvases in desc order", async () => {
    const canvases = await getCanvases();
    expect(canvases).toMatchObject([
      { id: 9, name: "Locked Canvas" },
      { id: 1, name: "Unlocked Canvas" },
    ]);
  });

  it("Gets canvas by ID", async () => {
    expect(await getCanvasInfo(1)).toMatchObject({
      id: 1,
      name: "Unlocked Canvas",
      width: 2,
      height: 2,
      isLocked: false,
      eventId: 1,
      startCoordinates: [1, 1],
    });

    expect(await getCanvasInfo(9)).toMatchObject({
      id: 9,
      name: "Locked Canvas",
      width: 2,
      height: 2,
      isLocked: true,
      eventId: 9,
      startCoordinates: [1, 1],
    });
  });
});

describe("Canvas Validation Tests", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await seedEvents();
    await seedCanvases();
  });

  it("Resolves valid canvas", async () => {
    return expect(getCanvasInfo(1)).resolves.not.toThrow();
  });

  it("Rejects nonexistent canvas", async () => {
    return expect(getCanvasInfo(9999)).rejects.toThrow(NotFoundError);
  });
});

describe("Canvas Pixels Tests", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await seedEvents();
    await seedCanvases();
    await seedColors();
    await seedPixels();
  });

  it("Gets canvas pixels", async () => {
    const pixels = await getCanvasPixels(1);
    expect(pixels.length).toBe(4);
    expect(pixels).toStrictEqual([
      [88, 101, 242, 127],
      [88, 101, 242, 255],
      [234, 35, 40, 255],
      [88, 101, 242, 127],
    ]);
  });
});

describe("Create Canvas Tests", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await seedEvents();
    await seedCanvases();
    await seedColors();
    await prisma.info.create({
      data: {
        title: "Canvas Test",
        canvas_admin: [],
        current_event_id: 1,
        cached_canvas_ids: [],
        admin_server_id: BigInt(1),
        current_emoji_server_id: BigInt(1),
        host_server_id: BigInt(1),
        default_canvas_id: 1,
      },
    });
    await prisma.$executeRawUnsafe(
      "SELECT setval(pg_get_serial_sequence('canvas', 'id'), (SELECT COALESCE(MAX(id), 0) FROM canvas) + 1, false);",
    );
  });

  it("Creates a canvas and seeds its pixels", async () => {
    const now = Date.now();
    const canvasName = `Generated Canvas ${now}`;

    await createCanvas({
      name: canvasName,
      width: 3,
      height: 2,
    });

    const createdCanvas = await prisma.canvas.findFirst({
      where: { name: canvasName },
      select: {
        id: true,
        width: true,
        height: true,
      },
    });

    expect(createdCanvas).not.toBeNull();
    expect(createdCanvas).toMatchObject({
      width: 3,
      height: 2,
    });

    if (!createdCanvas) {
      throw new Error("Expected the canvas to be created");
    }

    const pixels = await getCanvasPixels(createdCanvas.id);
    expect(pixels).toHaveLength(6);
    expect(pixels).toStrictEqual([
      [88, 101, 242, 127],
      [88, 101, 242, 127],
      [88, 101, 242, 127],
      [88, 101, 242, 127],
      [88, 101, 242, 127],
      [88, 101, 242, 127],
    ]);

    expect(vi.mocked(socketHandler.broadcastCanvasUpdate)).toHaveBeenCalledWith(
      expect.objectContaining({
        id: createdCanvas.id,
        name: canvasName,
        width: 3,
        height: 2,
        isLocked: true,
        allColorsGlobal: false,
        cooldownDuration: 15,
      }),
    );
  });
});

describe("Edit Canvas Tests", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await seedEvents();
    await seedCanvases();
  });

  it("Updates the canvas fields in the database", async () => {
    await editCanvas({
      canvasId: 1,
      name: "Edited Canvas",
      isLocked: true,
      allColorsGlobal: true,
      cooldownDuration: 45,
    });

    const canvas = await getCanvasInfo(1);
    expect(canvas).toMatchObject({
      id: 1,
      name: "Edited Canvas",
      isLocked: true,
      allColorsGlobal: true,
    });

    const updatedCanvas = await prisma.canvas.findFirst({
      where: { id: 1 },
      select: {
        cooldown_length: true,
        all_colors_global: true,
      },
    });

    expect(updatedCanvas).toMatchObject({
      cooldown_length: 45,
      all_colors_global: true,
    });

    expect(vi.mocked(socketHandler.broadcastCanvasUpdate)).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 1,
        name: "Edited Canvas",
        isLocked: true,
        allColorsGlobal: true,
        cooldownDuration: 45,
      }),
    );
  });
});

describe("Paste Canvas Data Tests", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await seedEvents();
    await seedCanvases();
  });

  it("validates paste data and creates bulk history entries", async () => {
    vi.mocked(getEventPalette).mockResolvedValueOnce([
      {
        id: 1,
        code: "5872f2ff",
        name: "Blurple",
        rgba: [88, 101, 242, 255],
        global: true,
        invite: null,
        guildName: null,
        guildId: null,
      },
      {
        id: 2,
        code: "ea2328ff",
        name: "Red",
        rgba: [234, 35, 40, 255],
        global: true,
        invite: null,
        guildName: null,
        guildId: null,
      },
    ]);

    const authorId = 123456789012345678n;

    await pasteCanvasData(1, authorId, [
      [0, 0, 1],
      [1, 1, 2],
    ]);

    expect(vi.mocked(getEventPalette)).toHaveBeenCalledWith(1, false);
    expect(vi.mocked(createBulkPlaceEntries)).toHaveBeenCalledWith({
      canvasId: 1,
      userId: authorId,
      entries: [
        { x: 0, y: 0, colorId: 1 },
        { x: 1, y: 1, colorId: 2 },
      ],
    });
  });
});

// TO DO - PNG and Cached Canvas Tests
