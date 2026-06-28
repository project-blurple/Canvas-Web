import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { ScheduleModule, SchedulerRegistry } from "@nestjs/schedule";
import { Test, type TestingModule } from "@nestjs/testing";

import { DatabaseModule } from "@/common/database/database.module";
import { AppConfigModule } from "@/config/config.module";
import { type SnapshotConfig, snapshotConfig } from "@/config/snapshot.config";
import { SNAPSHOT_SCHEDULER_TIMEOUT_NAME } from "@/snapshot/snapshot.constants";
import { testPrisma as prisma } from "@/test/database";
import { seedAll } from "@/test/seed";
import { testSnapshotPrisma } from "@/test/snapshot-database";
import { decodeRawPixels, pixelAt } from "@/test/snapshot-image";
import { SnapshotService } from "./snapshot.service";
import { SnapshotGeneratorService } from "./snapshot-generator.service";
import { SnapshotSchedulerService } from "./snapshot-scheduler.service";
import { SnapshotStoreService } from "./snapshot-store.service";

const TIMEOUT_NAME = SNAPSHOT_SCHEDULER_TIMEOUT_NAME;

const baseConfig: SnapshotConfig = {
  generate: true,
  availableForCanvases: [1],
  schedulerIntervalMs: 60_000,
  databasePath: "unused",
  databaseUrl: "file:unused",
  imageRoot: "unused",
};

function createModule(config: SnapshotConfig): Promise<TestingModule> {
  return Test.createTestingModule({
    imports: [AppConfigModule, DatabaseModule, ScheduleModule.forRoot()],
    providers: [
      SnapshotStoreService,
      SnapshotService,
      SnapshotGeneratorService,
      SnapshotSchedulerService,
    ],
  })
    .overrideProvider(snapshotConfig.KEY)
    .useValue(config)
    .compile();
}

describe("SnapshotSchedulerService", () => {
  describe("runCycle", () => {
    let moduleRef: TestingModule;
    let scheduler: SnapshotSchedulerService;
    let snapshotService: SnapshotService;
    let imageRoot: string;

    beforeAll(async () => {
      imageRoot = mkdtempSync(path.join(tmpdir(), "blurple-snapshot-images-"));
      moduleRef = await createModule({ ...baseConfig, imageRoot });
      scheduler = moduleRef.get(SnapshotSchedulerService);
      snapshotService = moduleRef.get(SnapshotService);
    });

    afterAll(async () => {
      await moduleRef.close();
      rmSync(imageRoot, { recursive: true, force: true });
    });

    beforeEach(async () => {
      await seedAll();
    });

    it("generates, persists, and records a snapshot for a ready window", async () => {
      const result = await scheduler.runCycle();

      expect(result.processed).toBe(1);

      const manifests = await testSnapshotPrisma.snapshotManifest.findMany({
        where: { canvasId: 1 },
      });
      expect(manifests).toHaveLength(1);
      const [manifest] = manifests;
      expect(manifest.snapshotAt).toEqual(new Date(600_000));
      expect(manifest.historyCount).toBe(6);
      expect(manifest.fileSizeBytes).toBeGreaterThan(0);
      expect(manifest.imagePath).toBe(
        path.resolve(imageRoot, "1", "snapshot-600000.webp"),
      );
      expect(existsSync(manifest.imagePath)).toBe(true);

      const data = await decodeRawPixels(await readFile(manifest.imagePath));
      expect(pixelAt(data, 2, 1, 0)).toEqual([88, 101, 242, 255]);
      expect(pixelAt(data, 2, 0, 1)).toEqual([234, 35, 40, 255]);

      const cursor = await testSnapshotPrisma.snapshotCursor.findUnique({
        where: { canvasId: 1 },
      });
      expect(cursor?.lastProcessedTimestamp).toEqual(new Date(600_000));
      expect(cursor?.dirtyFromTimestamp).toBeNull();
    });

    it("creates a cursor for a canvas that does not have one yet", async () => {
      expect(
        await testSnapshotPrisma.snapshotCursor.findUnique({
          where: { canvasId: 1 },
        }),
      ).toBeNull();

      await scheduler.runCycle();

      expect(
        await testSnapshotPrisma.snapshotCursor.findUnique({
          where: { canvasId: 1 },
        }),
      ).not.toBeNull();
    });

    it("does not reprocess a window once the cursor has advanced past it", async () => {
      await scheduler.runCycle();
      const second = await scheduler.runCycle();

      expect(second.processed).toBe(0);
      expect(
        await testSnapshotPrisma.snapshotManifest.count({
          where: { canvasId: 1 },
        }),
      ).toBe(1);
    });

    it("leaves the in-progress window alone until its 10-minute boundary has passed", async () => {
      const windowEnd = new Date("2026-03-01T00:20:00.000Z");
      await prisma.history.create({
        data: {
          canvasId: 1,
          userId: 1n,
          x: 1,
          y: 1,
          colorId: 4,
          timestamp: new Date("2026-03-01T00:12:00.000Z"),
        },
      });

      vi.useFakeTimers({ toFake: ["Date"] });
      try {
        vi.setSystemTime(new Date("2026-03-01T00:15:00.000Z"));
        const beforeBoundary = await scheduler.runCycle();
        expect(beforeBoundary.processed).toBe(1);
        expect(
          await testSnapshotPrisma.snapshotManifest.count({
            where: { canvasId: 1, snapshotAt: windowEnd },
          }),
        ).toBe(0);

        vi.setSystemTime(windowEnd);
        const afterBoundary = await scheduler.runCycle();
        expect(afterBoundary.processed).toBe(1);
      } finally {
        vi.useRealTimers();
      }

      const manifest =
        await testSnapshotPrisma.snapshotManifest.findUniqueOrThrow({
          where: {
            canvasId_snapshotAt: { canvasId: 1, snapshotAt: windowEnd },
          },
        });
      expect(manifest.historyCount).toBe(1);
      expect(manifest.imagePath).toBe(
        path.resolve(imageRoot, "1", `snapshot-${windowEnd.getTime()}.webp`),
      );
      expect(existsSync(manifest.imagePath)).toBe(true);

      const data = await decodeRawPixels(await readFile(manifest.imagePath));
      expect(pixelAt(data, 2, 1, 1)).toEqual([0, 90, 166, 255]);
      expect(pixelAt(data, 2, 0, 1)).toEqual([234, 35, 40, 255]);

      const cursor = await testSnapshotPrisma.snapshotCursor.findUnique({
        where: { canvasId: 1 },
      });
      expect(cursor?.lastProcessedTimestamp).toEqual(windowEnd);
    });

    it("regenerates a window after the canvas is marked dirty", async () => {
      await scheduler.runCycle();
      await snapshotService.setSnapshotDirtyTimestamp(1, new Date(0));

      const result = await scheduler.runCycle();

      expect(result.processed).toBe(1);
      expect(
        await testSnapshotPrisma.snapshotManifest.count({
          where: { canvasId: 1 },
        }),
      ).toBe(1);
      const cursor = await testSnapshotPrisma.snapshotCursor.findUnique({
        where: { canvasId: 1 },
      });
      expect(cursor?.dirtyFromTimestamp).toBeNull();
    });
  });

  describe("when generation is disabled", () => {
    let moduleRef: TestingModule;
    let scheduler: SnapshotSchedulerService;
    let registry: SchedulerRegistry;

    beforeAll(async () => {
      moduleRef = await createModule({ ...baseConfig, generate: false });
      scheduler = moduleRef.get(SnapshotSchedulerService);
      registry = moduleRef.get(SchedulerRegistry);
    });

    afterAll(async () => {
      await moduleRef.close();
    });

    it("runCycle generates nothing", async () => {
      expect(await scheduler.runCycle()).toEqual({ processed: 0, skipped: 0 });
      expect(await testSnapshotPrisma.snapshotManifest.count()).toBe(0);
    });

    it("does not arm the scheduling timeout on bootstrap", () => {
      scheduler.onApplicationBootstrap();

      expect(registry.doesExist("timeout", TIMEOUT_NAME)).toBe(false);
    });
  });

  describe("when no canvases are allowlisted", () => {
    let moduleRef: TestingModule;
    let scheduler: SnapshotSchedulerService;

    beforeAll(async () => {
      moduleRef = await createModule({
        ...baseConfig,
        availableForCanvases: [],
      });
      scheduler = moduleRef.get(SnapshotSchedulerService);
    });

    afterAll(async () => {
      await moduleRef.close();
    });

    it("runCycle generates nothing", async () => {
      expect(await scheduler.runCycle()).toEqual({ processed: 0, skipped: 0 });
      expect(await testSnapshotPrisma.snapshotManifest.count()).toBe(0);
    });
  });

  describe("bootstrap-driven generation", () => {
    let moduleRef: TestingModule;
    let scheduler: SnapshotSchedulerService;
    let imageRoot: string;

    beforeEach(async () => {
      imageRoot = mkdtempSync(path.join(tmpdir(), "blurple-snapshot-boot-"));
      moduleRef = await createModule({ ...baseConfig, imageRoot });
      scheduler = moduleRef.get(SnapshotSchedulerService);
      await seedAll();
    });

    afterEach(async () => {
      scheduler.onApplicationShutdown();
      await moduleRef.close();
      rmSync(imageRoot, { recursive: true, force: true });
    });

    it("writes a snapshot from the first armed cycle", async () => {
      scheduler.onApplicationBootstrap();

      // The cursor is the last write of a cycle.
      await vi.waitFor(
        async () => {
          const cursor = await testSnapshotPrisma.snapshotCursor.findUnique({
            where: { canvasId: 1 },
          });
          expect(cursor?.lastProcessedTimestamp).toEqual(new Date(600_000));
        },
        { timeout: 10_000, interval: 50 },
      );

      const manifest =
        await testSnapshotPrisma.snapshotManifest.findFirstOrThrow({
          where: { canvasId: 1 },
        });
      expect(manifest.imagePath).toBe(
        path.resolve(imageRoot, "1", "snapshot-600000.webp"),
      );
      expect(existsSync(manifest.imagePath)).toBe(true);
    });
  });

  // A fresh module per test: onApplicationShutdown stops the re-arm chain
  // permanently, so a scheduler instance can't be reused across these tests.
  describe("scheduling lifecycle", () => {
    let moduleRef: TestingModule;
    let scheduler: SnapshotSchedulerService;
    let registry: SchedulerRegistry;

    beforeEach(async () => {
      moduleRef = await createModule(baseConfig);
      scheduler = moduleRef.get(SnapshotSchedulerService);
      registry = moduleRef.get(SchedulerRegistry);
      vi.useFakeTimers();
    });

    afterEach(async () => {
      vi.useRealTimers();
      await moduleRef.close();
    });

    it("arms a self-rearming timeout and runs the first cycle", async () => {
      const runSpy = vi
        .spyOn(scheduler, "runCycle")
        .mockResolvedValue({ processed: 0, skipped: 0 });

      scheduler.onApplicationBootstrap();
      expect(registry.doesExist("timeout", TIMEOUT_NAME)).toBe(true);

      await vi.advanceTimersByTimeAsync(0);
      expect(runSpy).toHaveBeenCalledTimes(1);
      expect(registry.doesExist("timeout", TIMEOUT_NAME)).toBe(true);

      scheduler.onApplicationShutdown();
      expect(registry.doesExist("timeout", TIMEOUT_NAME)).toBe(false);
    });

    it("re-arms only after a cycle settles, so cycles never overlap", async () => {
      let resolveCycle: (() => void) | undefined;
      const runSpy = vi.spyOn(scheduler, "runCycle").mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveCycle = () => resolve({ processed: 0, skipped: 0 });
          }),
      );

      scheduler.onApplicationBootstrap();
      await vi.advanceTimersByTimeAsync(0);
      expect(runSpy).toHaveBeenCalledTimes(1);

      // While the first cycle is in-flight, no next timeout is armed, so
      // advancing time cannot trigger a second, overlapping run.
      expect(registry.doesExist("timeout", TIMEOUT_NAME)).toBe(false);
      await vi.advanceTimersByTimeAsync(120_000);
      expect(runSpy).toHaveBeenCalledTimes(1);

      resolveCycle?.();
      await vi.advanceTimersByTimeAsync(0);
      expect(registry.doesExist("timeout", TIMEOUT_NAME)).toBe(true);

      scheduler.onApplicationShutdown();
    });
  });
});
