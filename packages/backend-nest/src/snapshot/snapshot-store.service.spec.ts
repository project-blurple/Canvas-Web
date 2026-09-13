import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Test, type TestingModule } from "@nestjs/testing";

import { DatabaseModule } from "@/common/database/database.module";
import { AppConfigModule } from "@/config/config.module";
import { type SnapshotConfig, snapshotConfig } from "@/config/snapshot.config";
import { getSnapshotImagePath } from "@/snapshot/snapshot-paths";
import { testSnapshotPrisma } from "@/test/snapshot-database";
import { SnapshotStoreService } from "./snapshot-store.service";

const baseConfig: SnapshotConfig = {
  generate: true,
  availableForCanvases: [1],
  schedulerIntervalMs: 60_000,
  databasePath: "unused",
  databaseUrl: "file:unused",
  imageRoot: "/srv/app/static/snapshots",
};

function createModule(imageRoot: string): Promise<TestingModule> {
  return Test.createTestingModule({
    imports: [AppConfigModule, DatabaseModule],
    providers: [SnapshotStoreService],
  })
    .overrideProvider(snapshotConfig.KEY)
    .useValue({ ...baseConfig, imageRoot })
    .compile();
}

describe("SnapshotStoreService", () => {
  let moduleRef: TestingModule;
  let store: SnapshotStoreService;
  let imageRoot: string;

  beforeAll(async () => {
    imageRoot = mkdtempSync(path.join(tmpdir(), "blurple-snapshot-store-"));
    moduleRef = await createModule(imageRoot);
    store = moduleRef.get(SnapshotStoreService);
  });

  afterAll(async () => {
    await moduleRef.close();
    rmSync(imageRoot, { recursive: true, force: true });
  });

  describe("ensureCursors", () => {
    it("creates cursors starting at epoch for missing canvases", async () => {
      const cursors = await store.ensureCursors([1, 2]);

      expect(cursors.get(1)?.lastProcessedTimestamp).toEqual(new Date(0));
      expect(cursors.get(2)?.lastProcessedTimestamp).toEqual(new Date(0));
    });
  });

  describe("markDirty", () => {
    it("creates a cursor with epoch lastProcessedTimestamp when none exists", async () => {
      await store.markDirty(1, new Date("2026-01-01T00:00:00Z"));

      const cursor = await testSnapshotPrisma.snapshotCursor.findUniqueOrThrow({
        where: { canvasId: 1 },
      });
      expect(cursor.dirtyFromTimestamp).toEqual(
        new Date("2026-01-01T00:00:00Z"),
      );
      expect(cursor.lastProcessedTimestamp).toEqual(new Date(0));
    });
  });

  describe("upsertManifest", () => {
    it("writes the image and records fileSizeBytes", async () => {
      const snapshotAt = new Date(600_000);
      const image = Buffer.from("webp-image-data");

      await store.upsertManifest({
        canvasId: 1,
        snapshotAt,
        image,
        historyCount: 3,
        lastIncludedHistoryAt: new Date(9),
      });

      const filePath = getSnapshotImagePath(imageRoot, 1, snapshotAt);
      expect(existsSync(filePath)).toBe(true);
      expect(await readFile(filePath)).toEqual(image);

      const manifest =
        await testSnapshotPrisma.snapshotManifest.findFirstOrThrow({
          where: { canvasId: 1 },
        });
      expect(manifest.fileSizeBytes).toBe(image.length);
      expect(manifest.imagePath).toBe(filePath);
      expect(manifest.historyCount).toBe(3);
    });
  });

  describe("advanceCursor", () => {
    it("advances lastProcessedTimestamp and clears a covered dirty marker", async () => {
      await testSnapshotPrisma.snapshotCursor.create({
        data: {
          canvasId: 1,
          lastProcessedTimestamp: new Date(0),
          dirtyFromTimestamp: new Date(0),
        },
      });

      await store.advanceCursor(1, new Date(600_000));

      const cursor = await testSnapshotPrisma.snapshotCursor.findUniqueOrThrow({
        where: { canvasId: 1 },
      });
      expect(cursor.lastProcessedTimestamp).toEqual(new Date(600_000));
      expect(cursor.dirtyFromTimestamp).toBeNull();
    });
  });

  describe("findManifests", () => {
    beforeEach(async () => {
      await testSnapshotPrisma.snapshotManifest.createMany({
        data: [
          {
            canvasId: 1,
            snapshotAt: new Date(600_000),
            historyCount: 1,
            lastIncludedHistoryAt: new Date(100),
            imagePath: "/tmp/a.webp",
            fileSizeBytes: 10,
          },
          {
            canvasId: 1,
            snapshotAt: new Date(1_200_000),
            historyCount: 1,
            lastIncludedHistoryAt: new Date(700_000),
            imagePath: "/tmp/b.webp",
            fileSizeBytes: 20,
          },
        ],
      });
    });

    it("includes an extra frame after the upper bound", async () => {
      const manifests = await store.findManifests({
        canvasId: 1,
        to: new Date(500),
      });

      expect(manifests).toHaveLength(2);
      expect(manifests[0]?.lastIncludedHistoryAt).toEqual(new Date(700_000));
    });
  });
});
