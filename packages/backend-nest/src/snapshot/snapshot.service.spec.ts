import { Test, type TestingModule } from "@nestjs/testing";

import { DatabaseModule } from "@/common/database/database.module";
import { AppConfigModule } from "@/config/config.module";
import { type SnapshotConfig, snapshotConfig } from "@/config/snapshot.config";
import { testSnapshotPrisma } from "@/test/snapshot-database";
import { SnapshotService } from "./snapshot.service";
import { SnapshotStoreService } from "./snapshot-store.service";

const baseConfig: SnapshotConfig = {
  generate: true,
  availableForCanvases: [1],
  schedulerIntervalMs: 60_000,
  databasePath: "unused",
  databaseUrl: "file:unused",
  imageRoot: "/srv/app/static/snapshots",
};

function createModule(config: SnapshotConfig): Promise<TestingModule> {
  return Test.createTestingModule({
    imports: [AppConfigModule, DatabaseModule],
    providers: [SnapshotStoreService, SnapshotService],
  })
    .overrideProvider(snapshotConfig.KEY)
    .useValue(config)
    .compile();
}

describe("SnapshotService", () => {
  let moduleRef: TestingModule;
  let service: SnapshotService;

  beforeAll(async () => {
    moduleRef = await createModule(baseConfig);
    service = moduleRef.get(SnapshotService);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  describe("setSnapshotDirtyTimestamp", () => {
    it("creates a cursor carrying the dirty marker when none exists", async () => {
      const timestamp = new Date("2026-01-01T00:00:00Z");

      await service.setSnapshotDirtyTimestamp(1, timestamp);

      const cursor = await testSnapshotPrisma.snapshotCursor.findUniqueOrThrow({
        where: { canvasId: 1 },
      });
      expect(cursor.dirtyFromTimestamp).toEqual(timestamp);
      expect(cursor.lastProcessedTimestamp).toEqual(new Date(0));
    });

    it("moves an existing dirty marker earlier", async () => {
      await testSnapshotPrisma.snapshotCursor.create({
        data: {
          canvasId: 1,
          dirtyFromTimestamp: new Date("2026-02-01T00:00:00Z"),
        },
      });
      const earlier = new Date("2026-01-01T00:00:00Z");

      await service.setSnapshotDirtyTimestamp(1, earlier);

      const cursor = await testSnapshotPrisma.snapshotCursor.findUniqueOrThrow({
        where: { canvasId: 1 },
      });
      expect(cursor.dirtyFromTimestamp).toEqual(earlier);
    });

    it("never moves an existing dirty marker later", async () => {
      const earlier = new Date("2026-01-01T00:00:00Z");
      await testSnapshotPrisma.snapshotCursor.create({
        data: { canvasId: 1, dirtyFromTimestamp: earlier },
      });

      await service.setSnapshotDirtyTimestamp(
        1,
        new Date("2026-03-01T00:00:00Z"),
      );

      const cursor = await testSnapshotPrisma.snapshotCursor.findUniqueOrThrow({
        where: { canvasId: 1 },
      });
      expect(cursor.dirtyFromTimestamp).toEqual(earlier);
    });

    it("is a no-op for a canvas that is not allowlisted", async () => {
      await service.setSnapshotDirtyTimestamp(2, new Date());

      expect(await testSnapshotPrisma.snapshotCursor.count()).toBe(0);
    });
  });

  describe("getSnapshots", () => {
    beforeEach(async () => {
      await testSnapshotPrisma.snapshotManifest.createMany({
        data: [
          {
            canvasId: 1,
            snapshotAt: new Date(600_000),
            historyCount: 1,
            lastIncludedHistoryAt: new Date(100),
            imagePath: "/tmp/a.webp",
          },
          {
            canvasId: 1,
            snapshotAt: new Date(1_200_000),
            historyCount: 1,
            lastIncludedHistoryAt: new Date(700_000),
            imagePath: "/tmp/b.webp",
          },
        ],
      });
    });

    it("returns all manifests for an allowlisted canvas", async () => {
      const manifests = await service.getSnapshots({ canvasId: 1 });

      expect(manifests).toHaveLength(2);
    });

    it("filters by the requested range on lastIncludedHistoryAt", async () => {
      const manifests = await service.getSnapshots({
        canvasId: 1,
        from: new Date(500_000),
      });

      expect(manifests).toHaveLength(1);
      expect(manifests[0]?.lastIncludedHistoryAt).toEqual(new Date(700_000));
    });

    it("includes an extra frame after the upper bound", async () => {
      const manifests = await service.getSnapshots({
        canvasId: 1,
        to: new Date(500),
      });

      expect(manifests).toHaveLength(2);
      expect(manifests[0]?.lastIncludedHistoryAt).toEqual(new Date(700_000));
    });

    it("returns manifests within the requested range when both from and to are provided", async () => {
      const manifests = await service.getSnapshots({
        canvasId: 1,
        from: new Date(50),
        to: new Date(500),
      });

      expect(manifests).toHaveLength(2);
      expect(manifests[0]?.lastIncludedHistoryAt).toEqual(new Date(700_000));
      expect(manifests[1]?.lastIncludedHistoryAt).toEqual(new Date(100));
    });

    it("returns an empty list for a canvas that is not allowlisted", async () => {
      expect(await service.getSnapshots({ canvasId: 2 })).toEqual([]);
    });
  });

  describe("isAvailableForCanvas", () => {
    it("requires the canvas to be allowlisted", () => {
      expect(service.isAvailableForCanvas(1)).toBe(true);
      expect(service.isAvailableForCanvas(2)).toBe(false);
    });
  });

  describe("when generation is disabled", () => {
    let disabledRef: TestingModule;
    let disabled: SnapshotService;

    beforeAll(async () => {
      disabledRef = await createModule({ ...baseConfig, generate: false });
      disabled = disabledRef.get(SnapshotService);
    });

    afterAll(async () => {
      await disabledRef.close();
    });

    it("reports every canvas as unavailable", () => {
      expect(disabled.isAvailableForCanvas(1)).toBe(false);
    });

    it("does not write a cursor", async () => {
      await disabled.setSnapshotDirtyTimestamp(1, new Date());

      expect(await testSnapshotPrisma.snapshotCursor.count()).toBe(0);
    });
  });
});
