import { Test, TestingModule } from "@nestjs/testing";
import { DatabaseModule } from "@/common/database/database.module";
import { SnapshotPrismaService } from "@/common/database/snapshot/snapshot-prisma.service";
import { AppConfigModule } from "@/config/config.module";

describe("SnapshotPrismaService", () => {
  let snapshot: SnapshotPrismaService;
  let moduleRef: TestingModule;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppConfigModule, DatabaseModule],
    }).compile();
    await moduleRef.init();

    snapshot = moduleRef.get(SnapshotPrismaService);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it("round-trips snapshot manifest and cursor writes and reads", async () => {
    await snapshot.snapshotManifest.create({
      data: {
        canvasId: 1,
        snapshotAt: new Date(600_000),
        historyCount: 6,
        lastIncludedHistoryAt: new Date(9),
        imagePath: "/snapshots/1/snapshot-600000.webp",
      },
    });
    await snapshot.snapshotCursor.create({
      data: { canvasId: 1, lastProcessedTimestamp: new Date(600_000) },
    });

    const manifest = await snapshot.snapshotManifest.findFirstOrThrow({
      where: { canvasId: 1 },
    });
    expect(manifest.snapshotAt).toEqual(new Date(600_000));
    expect(manifest.historyCount).toBe(6);
    expect(manifest.imagePath).toBe("/snapshots/1/snapshot-600000.webp");

    const cursor = await snapshot.snapshotCursor.findUniqueOrThrow({
      where: { canvasId: 1 },
    });
    expect(cursor.lastProcessedTimestamp).toEqual(new Date(600_000));
    expect(cursor.dirtyFromTimestamp).toBeNull();
  });

  it("is isolated per test: the previous test's writes were truncated", async () => {
    expect(await snapshot.snapshotManifest.count()).toBe(0);
    expect(await snapshot.snapshotCursor.count()).toBe(0);
  });
});
