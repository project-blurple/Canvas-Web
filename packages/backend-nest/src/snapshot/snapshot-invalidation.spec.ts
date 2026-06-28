import { mkdtempSync, rmSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { PixelColor } from "@blurple-canvas-web/types";
import { ScheduleModule } from "@nestjs/schedule";
import { Test, type TestingModule } from "@nestjs/testing";

import { BlocklistService } from "@/blocklist/blocklist.service";
import { CanvasCacheService } from "@/canvas/canvas-cache.service";
import { PixelReconciliationService } from "@/canvas/pixel-reconciliation.service";
import { DatabaseModule } from "@/common/database/database.module";
import { AppConfigModule } from "@/config/config.module";
import { type SnapshotConfig, snapshotConfig } from "@/config/snapshot.config";
import { HistoryService } from "@/history/history.service";
import { PixelService } from "@/pixel/pixel.service";
import { BroadcastService } from "@/realtime/broadcast.service";
import { seedAll } from "@/test/seed";
import { testSnapshotPrisma } from "@/test/snapshot-database";
import { decodeRawPixels, pixelAt } from "@/test/snapshot-image";
import { SnapshotService } from "./snapshot.service";
import { SnapshotGeneratorService } from "./snapshot-generator.service";
import { SnapshotSchedulerService } from "./snapshot-scheduler.service";
import { SnapshotStoreService } from "./snapshot-store.service";

const BLANK: PixelColor = [88, 101, 242, 127];
const RED: PixelColor = [234, 35, 40, 255];
const WINDOW_END = new Date(600_000);
const RED_PLACED_AT = new Date(9);

const broadcastService = {
  broadcastPixel: vi.fn(),
  broadcastPixelsBulk: vi.fn(),
  broadcastCanvasInfo: vi.fn(),
};

const config: SnapshotConfig = {
  generate: true,
  availableForCanvases: [1],
  schedulerIntervalMs: 60_000,
  databasePath: "unused",
  databaseUrl: "file:unused",
  imageRoot: "unused",
};

describe("snapshot invalidation through history moderation", () => {
  let moduleRef: TestingModule;
  let scheduler: SnapshotSchedulerService;
  let historyService: HistoryService;
  let reconciliation: PixelReconciliationService;
  let imageRoot: string;

  beforeAll(async () => {
    imageRoot = mkdtempSync(path.join(tmpdir(), "blurple-snapshot-invalid-"));
    moduleRef = await Test.createTestingModule({
      imports: [AppConfigModule, DatabaseModule, ScheduleModule.forRoot()],
      providers: [
        HistoryService,
        PixelService,
        PixelReconciliationService,
        BlocklistService,
        CanvasCacheService,
        { provide: BroadcastService, useValue: broadcastService },
        SnapshotStoreService,
        SnapshotService,
        SnapshotGeneratorService,
        SnapshotSchedulerService,
      ],
    })
      .overrideProvider(snapshotConfig.KEY)
      .useValue({ ...config, imageRoot })
      .compile();

    scheduler = moduleRef.get(SnapshotSchedulerService);
    historyService = moduleRef.get(HistoryService);
    reconciliation = moduleRef.get(PixelReconciliationService);
  });

  afterAll(async () => {
    await moduleRef.close();
    rmSync(imageRoot, { recursive: true, force: true });
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    await seedAll();
  });

  async function readCursor() {
    return testSnapshotPrisma.snapshotCursor.findUniqueOrThrow({
      where: { canvasId: 1 },
    });
  }

  async function readManifest() {
    return testSnapshotPrisma.snapshotManifest.findUniqueOrThrow({
      where: { canvasId_snapshotAt: { canvasId: 1, snapshotAt: WINDOW_END } },
    });
  }

  async function snapshotPixel(x: number, y: number): Promise<number[]> {
    const { imagePath } = await readManifest();
    return pixelAt(await decodeRawPixels(await readFile(imagePath)), 2, x, y);
  }

  it("soft-erasing history moves the dirty marker back and the next cycle drops the pixel", async () => {
    await scheduler.runCycle();
    expect(await snapshotPixel(0, 1)).toEqual(RED);

    await historyService.deletePixelHistoryEntries({
      canvasId: 1,
      points: { x: 0, y: 1 },
    });

    const dirty = await readCursor();
    expect(dirty.dirtyFromTimestamp).toEqual(RED_PLACED_AT);
    expect(dirty.lastProcessedTimestamp).toEqual(WINDOW_END);

    const result = await scheduler.runCycle();
    expect(result.processed).toBe(1);

    expect(
      await testSnapshotPrisma.snapshotManifest.count({
        where: { canvasId: 1 },
      }),
    ).toBe(1);
    const manifest = await readManifest();
    expect(manifest.historyCount).toBe(5);
    expect(manifest.lastIncludedHistoryAt).toEqual(new Date(8));
    expect(await snapshotPixel(0, 1)).toEqual(BLANK);

    const settled = await readCursor();
    expect(settled.dirtyFromTimestamp).toBeNull();
    expect(settled.lastProcessedTimestamp).toEqual(WINDOW_END);
  });

  it("restoring erased history marks the canvas dirty again and brings the pixel back", async () => {
    await scheduler.runCycle();
    await historyService.deletePixelHistoryEntries({
      canvasId: 1,
      points: { x: 0, y: 1 },
    });
    await scheduler.runCycle();
    expect(await snapshotPixel(0, 1)).toEqual(BLANK);

    await reconciliation.restoreErasedHistory([1n], [1]);
    expect((await readCursor()).dirtyFromTimestamp).toEqual(RED_PLACED_AT);

    const result = await scheduler.runCycle();
    expect(result.processed).toBe(1);
    expect(await snapshotPixel(0, 1)).toEqual(RED);
    expect((await readCursor()).dirtyFromTimestamp).toBeNull();
  });

  it("ignores moderation on a canvas outside the allowlist", async () => {
    await historyService.deletePixelHistoryEntries({
      canvasId: 9,
      points: { x: 0, y: 1 },
    });

    expect(
      await testSnapshotPrisma.snapshotCursor.findUnique({
        where: { canvasId: 9 },
      }),
    ).toBeNull();
  });
});
