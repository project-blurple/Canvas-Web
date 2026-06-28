import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { PixelColor } from "@blurple-canvas-web/types";
import { Test, type TestingModule } from "@nestjs/testing";

import { DatabaseModule } from "@/common/database/database.module";
import { NotFoundError } from "@/common/errors/not-found.error";
import { AppConfigModule } from "@/config/config.module";
import { seedAll } from "@/test/seed";
import { testSnapshotPrisma } from "@/test/snapshot-database";
import {
  decodeRawPixels,
  pixelAt,
  writeSolidWebp,
} from "@/test/snapshot-image";
import { SnapshotGeneratorService } from "./snapshot-generator.service";
import { SnapshotStoreService } from "./snapshot-store.service";

const BLANK: PixelColor = [88, 101, 242, 127];
const BLURPLE: PixelColor = [88, 101, 242, 255];
const RED: PixelColor = [234, 35, 40, 255];
const PRIOR: PixelColor = [10, 20, 30, 255];

describe("SnapshotGeneratorService", () => {
  let moduleRef: TestingModule;
  let service: SnapshotGeneratorService;
  let imageDir: string;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppConfigModule, DatabaseModule],
      providers: [SnapshotStoreService, SnapshotGeneratorService],
    }).compile();
    await moduleRef.init();

    service = moduleRef.get(SnapshotGeneratorService);
    imageDir = mkdtempSync(path.join(tmpdir(), "blurple-snapshot-prior-"));
  });

  afterAll(async () => {
    rmSync(imageDir, { recursive: true, force: true });
    await moduleRef.close();
  });

  beforeEach(async () => {
    await seedAll();
  });

  it("renders the latest colour per pixel on a blank canvas when no prior snapshot exists", async () => {
    const { image, lastIncludedHistoryAt } = await service.buildSnapshot({
      canvasId: 1,
      before: new Date(600_000),
    });

    const data = await decodeRawPixels(image);
    expect(pixelAt(data, 2, 0, 0)).toEqual(BLANK);
    expect(pixelAt(data, 2, 1, 0)).toEqual(BLURPLE);
    expect(pixelAt(data, 2, 0, 1)).toEqual(RED);
    expect(pixelAt(data, 2, 1, 1)).toEqual(BLANK); // never placed -> blank fill
    expect(lastIncludedHistoryAt).toEqual(new Date(9));
  });

  it("excludes history at or after the exclusive upper bound", async () => {
    const { image, lastIncludedHistoryAt } = await service.buildSnapshot({
      canvasId: 1,
      before: new Date(9),
    });

    const data = await decodeRawPixels(image);
    expect(pixelAt(data, 2, 1, 0)).toEqual(BLURPLE);
    expect(pixelAt(data, 2, 0, 1)).toEqual(BLANK);
    expect(lastIncludedHistoryAt).toEqual(new Date(8));
  });

  it("replays history on top of the previous snapshot", async () => {
    const priorImagePath = path.join(imageDir, "prior.webp");
    await writeSolidWebp(priorImagePath, 2, 2, PRIOR);
    await testSnapshotPrisma.snapshotManifest.create({
      data: {
        canvasId: 1,
        snapshotAt: new Date(7),
        historyCount: 0,
        lastIncludedHistoryAt: new Date(7),
        imagePath: priorImagePath,
      },
    });

    const { image, lastIncludedHistoryAt } = await service.buildSnapshot({
      canvasId: 1,
      before: new Date(600_000),
    });

    const data = await decodeRawPixels(image);
    expect(pixelAt(data, 2, 0, 0)).toEqual(BLANK);
    expect(pixelAt(data, 2, 1, 0)).toEqual(BLURPLE);
    expect(pixelAt(data, 2, 0, 1)).toEqual(RED);
    expect(pixelAt(data, 2, 1, 1)).toEqual(PRIOR); // untouched -> kept from prior snapshot
    expect(lastIncludedHistoryAt).toEqual(new Date(9));
  });

  it("throws NotFoundError when the canvas does not exist", async () => {
    await expect(
      service.buildSnapshot({ canvasId: 4242, before: new Date(600_000) }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejects when the previous snapshot has mismatched dimensions", async () => {
    const priorImagePath = path.join(imageDir, "prior-3x3.webp");
    await writeSolidWebp(priorImagePath, 3, 3, PRIOR);
    await testSnapshotPrisma.snapshotManifest.create({
      data: {
        canvasId: 1,
        snapshotAt: new Date(7),
        historyCount: 0,
        lastIncludedHistoryAt: new Date(7),
        imagePath: priorImagePath,
      },
    });

    await expect(
      service.buildSnapshot({ canvasId: 1, before: new Date(600_000) }),
    ).rejects.toThrow("invalid dimensions");
  });

  it("rejects a window with no positive duration", async () => {
    await expect(
      service.buildSnapshot({ canvasId: 1, before: new Date(0) }),
    ).rejects.toThrow("to must be after from");
  });
});
