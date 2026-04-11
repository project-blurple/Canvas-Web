import { fail } from "node:assert";
import { prisma } from "@/client";
import config from "@/config";
import { BadRequestError, ForbiddenError, NotFoundError } from "@/errors";
import {
  seedBlacklist,
  seedCanvases,
  seedColors,
  seedDiscordProfiles,
  seedEvents,
  seedGuilds,
  seedPixels,
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
    await seedEvents();
    await seedUsers();
    await seedDiscordProfiles();
    await seedGuilds();
    await seedCanvases();
    await seedColors();
    await seedPixels();
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
