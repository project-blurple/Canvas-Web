import { CanvasPlaceState, type PaletteColor } from "@blurple-canvas-web/types";
import { Test, type TestingModule } from "@nestjs/testing";

import { BlocklistService } from "@/blocklist/blocklist.service";
import { CanvasCacheService } from "@/canvas/canvas-cache.service";
import { PixelReconciliationService } from "@/canvas/pixel-reconciliation.service";
import { DatabaseModule } from "@/common/database/database.module";
import { BadRequestError } from "@/common/errors/bad-request.error";
import { ForbiddenError } from "@/common/errors/forbidden.error";
import { NotFoundError } from "@/common/errors/not-found.error";
import { AppConfigModule } from "@/config/config.module";
import { BroadcastService } from "@/realtime/broadcast.service";
import { testPrisma as prisma } from "@/test/database";
import { seedAll } from "@/test/seed";
import { seedBlacklist } from "@/test/seed/blacklist";
import { seedCanvases } from "@/test/seed/canvases";
import { seedColors } from "@/test/seed/colors";
import { seedEvents } from "@/test/seed/events";
import { seedGuilds } from "@/test/seed/guilds";
import { seedUsers } from "@/test/seed/users";
import { PixelService } from "./pixel.service";

const broadcastService = {
  broadcastPixel: vi.fn(),
  broadcastPixelsBulk: vi.fn(),
};

const thirtySeconds = 30 * 1000;

describe("PixelService", () => {
  let moduleRef: TestingModule;
  let service: PixelService;
  let cacheService: CanvasCacheService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppConfigModule, DatabaseModule],
      providers: [
        PixelService,
        BlocklistService,
        CanvasCacheService,
        { provide: BroadcastService, useValue: broadcastService },
        {
          provide: PixelReconciliationService,
          useValue: { restoreErasedHistory: vi.fn() },
        },
      ],
    }).compile();
    await moduleRef.init();

    service = moduleRef.get(PixelService);
    cacheService = moduleRef.get(CanvasCacheService);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("validatePixel", () => {
    beforeEach(async () => {
      await seedEvents();
      await seedCanvases();
    });

    it("resolves valid canvas on top left pixel (0, 0)", async () => {
      await expect(
        service.validatePixel(1, { x: 0, y: 0 }, false),
      ).resolves.not.toThrow();
    });

    it("resolves valid canvas on bottom right pixel (1, 1)", async () => {
      await expect(
        service.validatePixel(1, { x: 1, y: 1 }, false),
      ).resolves.not.toThrow();
    });

    it("rejects with x too small", async () => {
      await expect(
        service.validatePixel(1, { x: -1, y: 0 }, false),
      ).rejects.toThrow(BadRequestError);
    });

    it("rejects with x too large", async () => {
      await expect(
        service.validatePixel(1, { x: 99, y: 0 }, false),
      ).rejects.toThrow(BadRequestError);
    });

    it("rejects valid canvas with y too small", async () => {
      await expect(
        service.validatePixel(1, { x: 0, y: -1 }, false),
      ).rejects.toThrow(BadRequestError);
    });

    it("rejects valid canvas with y too large", async () => {
      await expect(
        service.validatePixel(1, { x: 0, y: 99 }, false),
      ).rejects.toThrow(BadRequestError);
    });

    it("rejects nonexistent canvas", async () => {
      await expect(
        service.validatePixel(9999, { x: 0, y: 0 }, false),
      ).rejects.toThrow(NotFoundError);
    });

    it("rejects locked canvas when honorLocked is true", async () => {
      await expect(
        service.validatePixel(9, { x: 0, y: 0 }, true),
      ).rejects.toThrow(ForbiddenError);
    });

    it("resolves locked canvas when honorLocked is false", async () => {
      await expect(
        service.validatePixel(9, { x: 0, y: 0 }, false),
      ).resolves.not.toThrow();
    });

    describe("soft-locked canvas (no_new_users)", () => {
      beforeEach(async () => {
        await seedUsers();
        await seedColors();
        await prisma.canvas.update({
          where: { id: 1 },
          data: { placeState: CanvasPlaceState.NoNewUsers },
        });
      });

      async function placeHistory(
        userId: bigint,
        overrides: { erasedAt?: Date } = {},
      ) {
        await prisma.history.create({
          data: {
            canvasId: 1,
            userId,
            x: 0,
            y: 0,
            colorId: 1,
            timestamp: new Date(),
            erasedAt: overrides.erasedAt ?? null,
          },
        });
      }

      it("rejects a user with no existing placements when honorLocked is true", async () => {
        await expect(
          service.validatePixel(1, { x: 0, y: 0 }, true, 1n),
        ).rejects.toThrow(ForbiddenError);
      });

      it("resolves a user with an existing placement when honorLocked is true", async () => {
        await placeHistory(1n);

        await expect(
          service.validatePixel(1, { x: 0, y: 0 }, true, 1n),
        ).resolves.not.toThrow();
      });

      it("treats a user whose only placement was erased as a new user", async () => {
        await placeHistory(1n, { erasedAt: new Date() });

        await expect(
          service.validatePixel(1, { x: 0, y: 0 }, true, 1n),
        ).rejects.toThrow(ForbiddenError);
      });

      it("only counts the placing user's own history", async () => {
        await placeHistory(9n);

        await expect(
          service.validatePixel(1, { x: 0, y: 0 }, true, 1n),
        ).rejects.toThrow(ForbiddenError);
      });

      it("skips the soft-lock check when no userId is supplied", async () => {
        await expect(
          service.validatePixel(1, { x: 0, y: 0 }, true),
        ).resolves.not.toThrow();
      });

      it("ignores the soft-lock when honorLocked is false", async () => {
        await expect(
          service.validatePixel(1, { x: 0, y: 0 }, false, 1n),
        ).resolves.not.toThrow();
      });
    });
  });

  describe("validateColor", () => {
    const emptyGuildIds: ReadonlySet<string> = new Set<string>();

    beforeEach(async () => {
      await seedEvents();
      await seedCanvases();
      await seedColors();
      await seedGuilds();
    });

    it("resolves valid color", async () => {
      await expect(
        service.validateColor(1, 1, emptyGuildIds),
      ).resolves.not.toThrow();
    });

    it("rejects a non-global color when no participation exists for this event", async () => {
      await expect(service.validateColor(3, 1, emptyGuildIds)).rejects.toThrow(
        ForbiddenError,
      );
    });

    it("rejects a non-global color when the user is not in the partner guild", async () => {
      await prisma.participation.create({
        data: { colorId: 3, eventId: 1, guildId: 1n },
      });
      await expect(service.validateColor(3, 1, emptyGuildIds)).rejects.toThrow(
        ForbiddenError,
      );
    });

    it("resolves a non-global color when the canvas has allColorsGlobal=true regardless of guild membership", async () => {
      await prisma.canvas.update({
        where: { id: 1 },
        data: { allColorsGlobal: true },
      });

      await expect(
        service.validateColor(3, 1, emptyGuildIds),
      ).resolves.toMatchObject({ id: 3 });
    });

    it("resolves a non-global color when the user is in the partner guild", async () => {
      await prisma.participation.create({
        data: { colorId: 3, eventId: 1, guildId: 1n },
      });
      await expect(
        service.validateColor(3, 1, new Set(["1"])),
      ).resolves.toMatchObject({ id: 3 });
    });

    it("rejects a non-global color when the canvas has no event", async () => {
      await prisma.canvas.update({
        where: { id: 1 },
        data: { eventId: null },
      });

      await expect(service.validateColor(3, 1, new Set(["1"]))).rejects.toThrow(
        ForbiddenError,
      );
    });

    it("rejects invalid color", async () => {
      await expect(service.validateColor(99, 1, emptyGuildIds)).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe("validateUser", () => {
    beforeEach(async () => {
      await seedUsers();
      await seedBlacklist();
    });

    it("rejects blocklisted user", async () => {
      await expect(service.validateUser(9n)).rejects.toThrow(ForbiddenError);
    });

    it("resolves non-blocklisted user", async () => {
      await expect(service.validateUser(1n)).resolves.not.toThrow();
    });
  });

  describe("getCooldown", () => {
    beforeEach(async () => {
      await seedEvents();
      await seedUsers();
      await seedCanvases();
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("resolves canvas with no cooldown length", async () => {
      // A user theoretically shouldn't have cooldown time if the canvas doesn't
      await prisma.cooldown.create({
        data: { canvasId: 9, userId: 1n, cooldownTime: new Date() },
      });
      await expect(
        service.getCooldown(9, 1n, new Date()),
      ).resolves.toMatchObject({
        currentCooldown: null,
        futureCooldown: null,
      });
    });

    it("resolves user with no entry in cooldown table", async () => {
      await expect(
        service.getCooldown(1, 1n, new Date()),
      ).resolves.toMatchObject({
        currentCooldown: null,
        futureCooldown: new Date(Date.now() + thirtySeconds),
      });
    });

    it("resolves user with null cooldown", async () => {
      // Users with null cooldowns theoretically shouldn't exist
      await prisma.cooldown.create({
        data: { canvasId: 1, userId: 1n, cooldownTime: null },
      });
      await expect(
        service.getCooldown(1, 1n, new Date()),
      ).resolves.toMatchObject({
        currentCooldown: null,
        futureCooldown: new Date(Date.now() + thirtySeconds),
      });
    });

    it("resolves user with cooldown greater than 30 seconds", async () => {
      await prisma.cooldown.create({
        data: {
          canvasId: 1,
          userId: 1n,
          cooldownTime: new Date(),
        },
      });
      vi.advanceTimersByTime(thirtySeconds);
      await expect(
        service.getCooldown(1, 1n, new Date()),
      ).resolves.toMatchObject({
        currentCooldown: new Date(Date.now() - thirtySeconds),
        futureCooldown: new Date(Date.now() + thirtySeconds),
      });
    });

    it("rejects user with cooldown less than 30 seconds", async () => {
      await prisma.cooldown.create({
        data: { canvasId: 1, userId: 1n, cooldownTime: new Date() },
      });
      await expect(service.getCooldown(1, 1n, new Date())).rejects.toThrow(
        ForbiddenError,
      );
    });
  });

  describe("placePixel", () => {
    beforeEach(async () => {
      vi.useFakeTimers();
      await seedAll();
    });

    afterEach(async () => {
      vi.useRealTimers();
      // The render cache outlives the per-test database transaction.
      await cacheService.clearCachedCanvas(1);
    });

    it("places the pixel", async () => {
      const canvasId = 1;
      const userId = 1n;

      await service.placePixel(
        canvasId,
        userId,
        { x: 1, y: 1 },
        { id: 1, rgba: [88, 101, 242, 127] },
      );
      const before = await fetchCooldownPixelHistory(canvasId, userId, 1, 1);
      // Current implementation will reject if currentCooldown and futureCooldown are equal
      vi.advanceTimersByTime(thirtySeconds + 1);
      await service.placePixel(
        canvasId,
        userId,
        { x: 1, y: 1 },
        { id: 2, rgba: [88, 101, 242, 255] },
      );
      const after = await fetchCooldownPixelHistory(canvasId, userId, 1, 1);

      expect(before.pixel?.colorId).toBe(1);
      expect(after.pixel?.colorId).toBe(2);
      expect(before.cooldown).not.toStrictEqual(after.cooldown);
      expect(before.history.length + 1).toEqual(after.history.length);
    });

    it("only places once within 30 seconds", async () => {
      const canvasId = 1;
      const userId = 1n;
      const before = await fetchCooldownPixelHistory(canvasId, userId, 1, 1);
      await service.placePixel(
        canvasId,
        userId,
        { x: 1, y: 1 },
        { id: 1, rgba: [88, 101, 242, 127] },
      );
      for (let i = 0; i < 3; i++) {
        await expect(
          service.placePixel(
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

    it("only allows one of two parallel placements and rejects the other with a ForbiddenError when there is no previous cooldown", async () => {
      const canvasId = 1;
      const color = { id: 1, rgba: [88, 101, 242, 127] } as Pick<
        PaletteColor,
        "id" | "rgba"
      >;
      const historyBefore = await prisma.history.count({
        where: { canvasId, userId: 1n },
      });

      const results = await Promise.allSettled([
        service.placePixel(canvasId, 1n, { x: 0, y: 0 }, color),
        service.placePixel(canvasId, 1n, { x: 0, y: 0 }, color),
      ]);

      const successes = results.filter(
        (result) => result.status === "fulfilled",
      );
      const failures = results.filter((result) => result.status === "rejected");

      expect(successes).toHaveLength(1);
      expect(failures).toHaveLength(1);
      expect(failures[0].reason).toBeInstanceOf(ForbiddenError);

      // Exactly one new history entry should have been written
      const historyAfter = await prisma.history.count({
        where: { canvasId, userId: 1n },
      });
      expect(historyAfter - historyBefore).toBe(1);
    });

    it("only allows one of two parallel placements and rejects the other with a ForbiddenError when the cooldown has just expired", async () => {
      const canvasId = 1;
      const color = { id: 1, rgba: [88, 101, 242, 127] } as Pick<
        PaletteColor,
        "id" | "rgba"
      >;

      // Seed an already-expired cooldown record (in the past)
      await prisma.cooldown.create({
        data: { canvasId, userId: 1n, cooldownTime: new Date(0) },
      });

      const historyBefore = await prisma.history.count({
        where: { canvasId, userId: 1n },
      });

      const results = await Promise.allSettled([
        service.placePixel(canvasId, 1n, { x: 0, y: 0 }, color),
        service.placePixel(canvasId, 1n, { x: 0, y: 0 }, color),
      ]);

      const successes = results.filter(
        (result) => result.status === "fulfilled",
      );
      const failures = results.filter((result) => result.status === "rejected");

      expect(successes).toHaveLength(1);
      expect(failures).toHaveLength(1);
      expect((failures[0] as PromiseRejectedResult).reason).toBeInstanceOf(
        ForbiddenError,
      );

      // Exactly one new history entry should have been written
      const historyAfter = await prisma.history.count({
        where: { canvasId, userId: 1n },
      });
      expect(historyAfter - historyBefore).toBe(1);
    });

    it("allows a user with cooldownTime=null to place a pixel", async () => {
      const canvasId = 1;
      const color = { id: 1, rgba: [88, 101, 242, 127] } as Pick<
        PaletteColor,
        "id" | "rgba"
      >;

      await prisma.cooldown.create({
        data: { canvasId, userId: 1n, cooldownTime: null },
      });

      await expect(
        service.placePixel(canvasId, 1n, { x: 0, y: 0 }, color),
      ).resolves.not.toThrow();

      // Cooldown should now be set to a future time (bypass is consumed by placement)
      const cooldown = await prisma.cooldown.findFirst({
        where: { canvasId, userId: 1n },
      });
      expect(cooldown?.cooldownTime).not.toBeNull();
      expect(cooldown?.cooldownTime?.getTime()).toBeGreaterThan(Date.now());
    });

    it("creates the placing user when they don't exist yet", async () => {
      const canvasId = 1;
      // An ID that is not part of the seeded users.
      const userId = 123456789n;

      await expect(
        service.placePixel(
          canvasId,
          userId,
          { x: 0, y: 0 },
          { id: 2, rgba: [88, 101, 242, 255] },
        ),
      ).resolves.not.toThrow();

      expect(
        await prisma.user.findUnique({ where: { id: userId } }),
      ).not.toBeNull();
      expect(
        await prisma.history.findFirst({
          where: { canvasId, userId, x: 0, y: 0 },
        }),
      ).not.toBeNull();
    });

    it("attributes the history entry to the web guild ID 0", async () => {
      await service.placePixel(
        1,
        1n,
        { x: 1, y: 1 },
        { id: 2, rgba: [88, 101, 242, 255] },
      );

      const entry = await prisma.history.findFirst({
        where: { canvasId: 1, x: 1, y: 1, colorId: 2 },
        select: { guildId: true },
      });
      expect(entry?.guildId).toBe(0n);
    });

    it("broadcasts the placed pixel once", async () => {
      await service.placePixel(
        1,
        1n,
        { x: 1, y: 1 },
        { id: 2, rgba: [88, 101, 242, 255] },
      );

      expect(broadcastService.broadcastPixel).toHaveBeenCalledExactlyOnceWith(
        1,
        { x: 1, y: 1, rgba: [88, 101, 242, 255] },
      );
    });

    it("updates the cached canvas pixel", async () => {
      const canvasId = 1;
      const userId = 1n;

      // Causes canvas to get loaded into cache
      const canvas = await cacheService.getCanvasPng(canvasId);

      // Necessary for Typescript to correctly identify which of the union types are applicable.
      if (canvas.placeState !== CanvasPlaceState.Anyone) {
        throw new Error("Canvas should not be locked");
      }

      expect(canvas.pixels).toStrictEqual([
        [88, 101, 242, 127],
        [88, 101, 242, 255],
        [234, 35, 40, 255],
        [88, 101, 242, 127],
      ]);

      await service.placePixel(
        canvasId,
        userId,
        { x: 1, y: 1 },
        { id: 2, rgba: [88, 101, 242, 255] },
      );

      const updatedCanvas = await cacheService.getCanvasPng(canvasId);

      if (updatedCanvas.placeState === CanvasPlaceState.NoOne) {
        throw new Error("Canvas should not be locked");
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
          userId,
          canvasId,
        },
      });
      const pixel = await prisma.pixel.findFirst({
        where: {
          canvasId,
          x,
          y,
        },
      });
      const history = await prisma.history.findMany({
        where: {
          canvasId,
          x,
          y,
        },
      });
      return { cooldown, pixel, history };
    }
  });
});
