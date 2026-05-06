import { fail } from "node:assert";
import { prisma } from "@/client";
import config from "@/config";
import { BadRequestError, ForbiddenError, NotFoundError } from "@/errors";
import seedAll, {
  seedBlacklist,
  seedCanvases,
  seedColors,
  seedEvents,
  seedUsers,
} from "@/test";

vi.mock("@/index", () => ({
  socketHandler: {
    broadcastPixelPlacement: vi.fn(),
  },
}));

import { getCanvasPng } from "./canvasService";
import {
  getCooldown,
  placePixel,
  restorePixelsAfterHistoryDeletion,
  validateColor,
  validatePixel,
  validateUser,
} from "./pixelService";

describe("Pixel Validation Tests", () => {
  beforeEach(async () => {
    await seedEvents();
    await seedCanvases();
  });

  it("Resolves valid canvas on top left pixel (0, 0)", async () => {
    return expect(
      validatePixel(1, { x: 0, y: 0 }, false),
    ).resolves.not.toThrow();
  });

  it("Resolves valid canvas on bottom right pixel (1, 1)", async () => {
    return expect(
      validatePixel(1, { x: 1, y: 1 }, false),
    ).resolves.not.toThrow();
  });

  it("Rejects with x too small", async () => {
    return expect(validatePixel(1, { x: -1, y: 0 }, false)).rejects.toThrow(
      BadRequestError,
    );
  });

  it("Rejects with x too large", async () => {
    return expect(validatePixel(1, { x: 99, y: 0 }, false)).rejects.toThrow(
      BadRequestError,
    );
  });

  it("Rejects valid canvas with y too small", async () => {
    return expect(validatePixel(1, { x: 0, y: -1 }, false)).rejects.toThrow(
      BadRequestError,
    );
  });

  it("Rejects valid canvas with y too large", async () => {
    return expect(validatePixel(1, { x: 0, y: 99 }, false)).rejects.toThrow(
      BadRequestError,
    );
  });

  it("Rejects nonexistent canvas", async () => {
    return expect(validatePixel(9999, { x: 0, y: 0 }, false)).rejects.toThrow(
      NotFoundError,
    );
  });

  it("Rejects locked canvas when honorLocked is true", async () => {
    return expect(validatePixel(9, { x: 0, y: 0 }, true)).rejects.toThrow(
      ForbiddenError,
    );
  });

  it("Resolves locked canvas when honorLocked is false", async () => {
    return expect(
      validatePixel(9, { x: 0, y: 0 }, false),
    ).resolves.not.toThrow();
  });
});

describe("Color Validation Tests", () => {
  beforeEach(async () => {
    await seedColors();
  });

  it("Resolves valid color", async () => {
    return expect(validateColor(1)).resolves.not.toThrow();
  });

  it("Rejects color that is not global", async () => {
    if (config.allColorsGlobal) {
      return expect(validateColor(3)).resolves.toMatchObject({ id: 3 });
    }

    return expect(validateColor(3)).rejects.toThrow(ForbiddenError);
  });

  it("Rejects invalid color", async () => {
    return expect(validateColor(99)).rejects.toThrow(NotFoundError);
  });
});

describe("User Validation Tests", () => {
  beforeEach(async () => {
    await seedUsers();
    await seedBlacklist();
  });

  it("Rejects blacklisted user", async () => {
    return expect(validateUser(BigInt(9))).rejects.toThrow(ForbiddenError);
  });

  it("Resolves non-blacklisted user", async () => {
    return expect(validateUser(BigInt(1))).resolves.not.toThrow();
  });
});

describe("Get Cooldown Tests", () => {
  beforeEach(async () => {
    await seedEvents();
    await seedUsers();
    await seedCanvases();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("Resolves canvas with no cooldown_time", async () => {
    // A user theoretically shouldn't have cooldown time if the canvas doesn't
    await prisma.cooldown.create({
      data: { canvas_id: 9, user_id: BigInt(1), cooldown_time: new Date() },
    });
    return expect(getCooldown(9, BigInt(1), new Date())).resolves.toMatchObject(
      {
        currentCooldown: null,
        futureCooldown: null,
      },
    );
  });

  it("Resolves user with no entry in cooldown table", async () => {
    return expect(getCooldown(1, BigInt(1), new Date())).resolves.toMatchObject(
      {
        currentCooldown: null,
        futureCooldown: new Date(Date.now() + 30 * 1000),
      },
    );
  });

  it("Resolves user with null cooldown", async () => {
    // Users with null cooldowns theoretically shouldn't exist
    await prisma.cooldown.create({
      data: { canvas_id: 1, user_id: BigInt(1), cooldown_time: null },
    });
    return expect(getCooldown(1, BigInt(1), new Date())).resolves.toMatchObject(
      {
        currentCooldown: null,
        futureCooldown: new Date(Date.now() + 30 * 1000),
      },
    );
  });

  it("Resolves user with cooldown greater than 30 seconds", async () => {
    await prisma.cooldown.create({
      data: {
        canvas_id: 1,
        user_id: BigInt(1),
        cooldown_time: new Date(),
      },
    });
    vi.advanceTimersByTime(30 * 1000);
    return expect(getCooldown(1, BigInt(1), new Date())).resolves.toMatchObject(
      {
        currentCooldown: new Date(Date.now() - 30 * 1000),
        futureCooldown: new Date(Date.now() + 30 * 1000),
      },
    );
  });

  it("Rejects user with cooldown less than 30 seconds", async () => {
    await prisma.cooldown.create({
      data: { canvas_id: 1, user_id: BigInt(1), cooldown_time: new Date() },
    });
    return expect(getCooldown(1, BigInt(1), new Date())).rejects.toThrow(
      ForbiddenError,
    );
  });
});

describe("Place Pixel Tests", () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    await seedAll();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("Places the pixel", async () => {
    const canvasId = 1;
    const userId = BigInt(1);

    await placePixel(
      canvasId,
      userId,
      { x: 1, y: 1 },
      { id: 1, rgba: [88, 101, 242, 127] },
    );
    const before = await fetchCooldownPixelHistory(canvasId, userId, 1, 1);
    // Current implementation will reject if currentCooldown and futureCooldown are equal
    vi.advanceTimersByTime(30 * 1000 + 1);
    await placePixel(
      canvasId,
      userId,
      { x: 1, y: 1 },
      { id: 2, rgba: [88, 101, 242, 255] },
    );
    const after = await fetchCooldownPixelHistory(canvasId, userId, 1, 1);

    expect(before.pixel?.color_id).toBe(1);
    expect(after.pixel?.color_id).toBe(2);
    expect(before.cooldown).not.toStrictEqual(after.cooldown);
    expect(before.history.length + 1).toEqual(after.history.length);
  });

  it("It only places once within 30 seconds", async () => {
    const canvasId = 1;
    const userId = BigInt(1);
    const before = await fetchCooldownPixelHistory(canvasId, userId, 1, 1);
    await placePixel(
      canvasId,
      userId,
      { x: 1, y: 1 },
      { id: 1, rgba: [88, 101, 242, 127] },
    );
    for (let i = 0; i < 3; i++) {
      await expect(
        placePixel(
          canvasId,
          userId,
          { x: 1, y: 1 },
          { id: 1, rgba: [88, 101, 242, 127] },
        ),
      ).rejects.toThrow(ForbiddenError);
    }
    const after = await fetchCooldownPixelHistory(canvasId, userId, 1, 1);
    expect(before.history.length + 1).toEqual(after.history.length);
  });

  it("Resolves updating cached canvas pixel", async () => {
    const canvasId = 1;
    const userId = BigInt(1);

    // Causes canvas to get loaded into cache
    const canvas = await getCanvasPng(canvasId);

    // Necessary for Typescript to correctly identify which of the union types are applicable.
    if (canvas.isLocked) {
      fail("Canvas should not be locked");
    }

    expect(canvas.pixels).toStrictEqual([
      [88, 101, 242, 127],
      [88, 101, 242, 255],
      [234, 35, 40, 255],
      [88, 101, 242, 127],
    ]);

    await placePixel(
      canvasId,
      userId,
      { x: 1, y: 1 },
      { id: 2, rgba: [88, 101, 242, 255] },
    );

    const updatedCanvas = await getCanvasPng(canvasId);

    if (updatedCanvas.isLocked) {
      fail("Canvas should not be locked");
    }

    expect(updatedCanvas.pixels).toStrictEqual([
      [88, 101, 242, 127],
      [88, 101, 242, 255],
      [234, 35, 40, 255],
      [88, 101, 242, 255], // <- This pixel should have updated
    ]);
  });

  async function fetchCooldownPixelHistory(
    canvasId: number,
    userId: bigint,
    x: number,
    y: number,
  ) {
    const cooldown = await prisma.cooldown.findFirst({
      where: {
        user_id: userId,
        canvas_id: canvasId,
      },
    });
    const pixel = await prisma.pixel.findFirst({
      where: {
        canvas_id: canvasId,
        x: x,
        y: y,
      },
    });
    const history = await prisma.history.findMany({
      where: {
        canvas_id: canvasId,
        x: x,
        y: y,
      },
    });
    return { cooldown, pixel, history };
  }
});

describe("Restore Pixels After History Deletion Tests", () => {
  async function setupMinimalCanvas() {
    // Create minimal canvas (2x2) without full seeding
    await prisma.event.create({
      data: { id: 1, name: "Test Event" },
    });
    await prisma.canvas.create({
      data: {
        id: 1,
        event_id: 1,
        name: "Test Canvas",
        width: 2,
        height: 2,
        locked: false,
        cooldown_length: 0,
      },
    });
    // Create colors
    await prisma.color.createMany({
      data: [
        {
          id: 1,
          code: "blank",
          emoji_name: "pl_blank",
          emoji_id: BigInt("540761786484391957"),
          global: true,
          name: "Blank",
          rgba: [88, 101, 242, 127],
        },
        {
          id: 2,
          code: "red",
          emoji_name: "pl_red",
          emoji_id: BigInt("572564652559564810"),
          global: true,
          name: "Red",
          rgba: [234, 35, 40, 255],
        },
        {
          id: 3,
          code: "blue",
          emoji_name: "pl_blue",
          emoji_id: BigInt("840064486374637608"),
          global: true,
          name: "Blue",
          rgba: [0, 90, 166, 255],
        },
      ],
    });
  }

  beforeEach(async () => {
    await setupMinimalCanvas();
  });

  it("Restores single coordinate to its latest history color", async () => {
    // Create pixel and history
    await prisma.pixel.create({
      data: { canvas_id: 1, x: 0, y: 0, color_id: 2 },
    });
    await prisma.history.create({
      data: {
        canvas_id: 1,
        x: 0,
        y: 0,
        color_id: 2,
        user_id: BigInt(1),
        timestamp: new Date("2024-01-01"),
        guild_id: BigInt(1),
      },
    });

    // Update pixel to different color
    await prisma.pixel.update({
      where: { canvas_id_x_y: { canvas_id: 1, x: 0, y: 0 } },
      data: { color_id: 3 },
    });

    // Restore
    await restorePixelsAfterHistoryDeletion(1, [{ x: 0, y: 0 }]);

    const restored = await prisma.pixel.findUnique({
      where: { canvas_id_x_y: { canvas_id: 1, x: 0, y: 0 } },
    });

    expect(restored?.color_id).toBe(2);
  });

  it("Restores coordinate with no history to blank color", async () => {
    // Create pixel with blank color
    await prisma.pixel.create({
      data: { canvas_id: 1, x: 0, y: 0, color_id: 1 },
    });

    // Update pixel to different color
    await prisma.pixel.update({
      where: { canvas_id_x_y: { canvas_id: 1, x: 0, y: 0 } },
      data: { color_id: 2 },
    });

    // Restore without any history entries
    await restorePixelsAfterHistoryDeletion(1, [{ x: 0, y: 0 }]);

    const restored = await prisma.pixel.findUnique({
      where: { canvas_id_x_y: { canvas_id: 1, x: 0, y: 0 } },
    });

    expect(restored?.color_id).toBe(1); // BLANK_PIXEL_COLOR_ID
  });

  it("Restores multiple coordinates with different colors", async () => {
    // Create pixels and history with different colors
    const coords = [
      { x: 0, y: 0, colorId: 2 },
      { x: 0, y: 1, colorId: 3 },
      { x: 1, y: 0, colorId: 2 },
    ];

    for (const { x, y, colorId } of coords) {
      await prisma.pixel.create({
        data: { canvas_id: 1, x, y, color_id: colorId },
      });
      await prisma.history.create({
        data: {
          canvas_id: 1,
          x,
          y,
          color_id: colorId,
          user_id: BigInt(1),
          timestamp: new Date("2024-01-01"),
          guild_id: BigInt(1),
        },
      });
    }

    // Change all pixels to color 1
    for (const { x, y } of coords) {
      await prisma.pixel.update({
        where: { canvas_id_x_y: { canvas_id: 1, x, y } },
        data: { color_id: 1 },
      });
    }

    // Restore
    await restorePixelsAfterHistoryDeletion(
      1,
      coords.map(({ x, y }) => ({ x, y })),
    );

    const restored = await prisma.pixel.findMany({
      where: { canvas_id: 1 },
      orderBy: [{ x: "asc" }, { y: "asc" }],
    });

    expect(restored).toHaveLength(3);
    expect(restored[0]).toMatchObject({ x: 0, y: 0, color_id: 2 });
    expect(restored[1]).toMatchObject({ x: 0, y: 1, color_id: 3 });
    expect(restored[2]).toMatchObject({ x: 1, y: 0, color_id: 2 });
  });

  it("Handles empty coordinate list", async () => {
    // Create a pixel
    await prisma.pixel.create({
      data: { canvas_id: 1, x: 0, y: 0, color_id: 2 },
    });

    // Restore with empty list - should be a no-op
    await expect(
      restorePixelsAfterHistoryDeletion(1, []),
    ).resolves.not.toThrow();

    // Pixel should be unchanged
    const pixel = await prisma.pixel.findUnique({
      where: { canvas_id_x_y: { canvas_id: 1, x: 0, y: 0 } },
    });
    expect(pixel?.color_id).toBe(2);
  });

  it("Restores coordinates to latest history entry when multiple exist", async () => {
    // Create pixel
    await prisma.pixel.create({
      data: { canvas_id: 1, x: 0, y: 0, color_id: 1 },
    });

    // Create multiple history entries with different timestamps and colors
    await prisma.history.create({
      data: {
        canvas_id: 1,
        x: 0,
        y: 0,
        color_id: 2,
        user_id: BigInt(1),
        timestamp: new Date("2024-01-01"),
        guild_id: BigInt(1),
      },
    });
    await prisma.history.create({
      data: {
        canvas_id: 1,
        x: 0,
        y: 0,
        color_id: 3,
        user_id: BigInt(2),
        timestamp: new Date("2024-01-02"), // Later timestamp
        guild_id: BigInt(1),
      },
    });

    // Change pixel to different color
    await prisma.pixel.update({
      where: { canvas_id_x_y: { canvas_id: 1, x: 0, y: 0 } },
      data: { color_id: 1 },
    });

    // Restore
    await restorePixelsAfterHistoryDeletion(1, [{ x: 0, y: 0 }]);

    const restored = await prisma.pixel.findUnique({
      where: { canvas_id_x_y: { canvas_id: 1, x: 0, y: 0 } },
    });

    expect(restored?.color_id).toBe(3); // Should be color from latest history
  });

  it("Ignores erased_at history entries", async () => {
    // Create pixel
    await prisma.pixel.create({
      data: { canvas_id: 1, x: 0, y: 0, color_id: 1 },
    });

    // Create history entries
    await prisma.history.create({
      data: {
        canvas_id: 1,
        x: 0,
        y: 0,
        color_id: 2,
        user_id: BigInt(1),
        timestamp: new Date("2024-01-02"),
        guild_id: BigInt(1),
      },
    });
    await prisma.history.create({
      data: {
        canvas_id: 1,
        x: 0,
        y: 0,
        color_id: 3,
        user_id: BigInt(2),
        timestamp: new Date("2024-01-01"),
        erased_at: new Date("2024-01-03"), // Marked as erased
        guild_id: BigInt(1),
      },
    });

    // Change pixel
    await prisma.pixel.update({
      where: { canvas_id_x_y: { canvas_id: 1, x: 0, y: 0 } },
      data: { color_id: 1 },
    });

    // Restore
    await restorePixelsAfterHistoryDeletion(1, [{ x: 0, y: 0 }]);

    const restored = await prisma.pixel.findUnique({
      where: { canvas_id_x_y: { canvas_id: 1, x: 0, y: 0 } },
    });

    expect(restored?.color_id).toBe(2); // Should be non-erased entry
  });

  it("Handles chunking correctly for large coordinate sets", async () => {
    // Create 501 coordinates (more than default chunk size of 500)
    const coords = [];
    for (let i = 0; i < 501; i++) {
      coords.push({
        x: i % 2,
        y: Math.floor(i / 2),
      });
    }

    // Extend canvas to fit
    await prisma.canvas.update({
      where: { id: 1 },
      data: { height: 251 },
    });

    // Create pixels and history
    for (const { x, y } of coords) {
      await prisma.pixel.create({
        data: { canvas_id: 1, x, y, color_id: 2 },
      });
      await prisma.history.create({
        data: {
          canvas_id: 1,
          x,
          y,
          color_id: 2,
          user_id: BigInt(1),
          timestamp: new Date("2024-01-01"),
          guild_id: BigInt(1),
        },
      });
    }

    // Change all to color 3
    for (const { x, y } of coords) {
      await prisma.pixel.update({
        where: { canvas_id_x_y: { canvas_id: 1, x, y } },
        data: { color_id: 3 },
      });
    }

    // Restore all at once - should chunk internally
    await restorePixelsAfterHistoryDeletion(1, coords);

    // Verify all were restored
    const restored = await prisma.pixel.findMany({
      where: { canvas_id: 1, color_id: 2 },
    });

    expect(restored).toHaveLength(501);
  });

  it("Deduplicates duplicate coordinates in input", async () => {
    // Create pixel and history
    await prisma.pixel.create({
      data: { canvas_id: 1, x: 0, y: 0, color_id: 2 },
    });
    await prisma.history.create({
      data: {
        canvas_id: 1,
        x: 0,
        y: 0,
        color_id: 2,
        user_id: BigInt(1),
        timestamp: new Date("2024-01-01"),
        guild_id: BigInt(1),
      },
    });

    // Change pixel
    await prisma.pixel.update({
      where: { canvas_id_x_y: { canvas_id: 1, x: 0, y: 0 } },
      data: { color_id: 3 },
    });

    // Restore with duplicate coordinates
    await restorePixelsAfterHistoryDeletion(1, [
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 0, y: 0 },
    ]);

    const restored = await prisma.pixel.findUnique({
      where: { canvas_id_x_y: { canvas_id: 1, x: 0, y: 0 } },
    });

    expect(restored?.color_id).toBe(2);
  });
});
