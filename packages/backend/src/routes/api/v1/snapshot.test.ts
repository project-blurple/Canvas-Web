import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import express from "express";
import request from "supertest";
import { errorHandler } from "@/middleware/errorHandler";
import { getSnapshotManifest, getSnapshots } from "@/services/snapshot";
import { getSnapshotManifest as getSnapshotManifestService } from "@/services/snapshot/snapshotService";
import { snapshotRouter } from "./snapshot";

vi.mock("@/services/snapshot", () => ({
  getSnapshotManifest: vi.fn(),
  getSnapshots: vi.fn(),
}));

vi.mock("@/services/snapshot/snapshotService", () => ({
  getSnapshotManifest: vi.fn(),
}));

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use("/api/v1/canvas/:canvasId/snapshots", snapshotRouter);
  app.use(errorHandler);
  return app;
};

describe("Snapshot route tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns snapshot manifest entries", async () => {
    const snapshotAt = new Date("2026-05-01T00:10:00.000Z");
    const lastIncludedHistoryAt = new Date("2026-05-01T00:09:59.000Z");

    vi.mocked(getSnapshots).mockResolvedValueOnce([
      {
        canvas_id: 9,
        snapshot_at: snapshotAt,
        history_count: 120,
        last_included_history_at: lastIncludedHistoryAt,
        image_path: "/app/static/snapshots/9/snapshot-1.png",
        file_size_bytes: 2048,
        created_at: snapshotAt,
        updated_at: snapshotAt,
      },
    ] as never);

    const app = createApp();
    const response = await request(app).get("/api/v1/canvas/9/snapshots");

    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual([
      {
        canvasId: 9,
        snapshotAt: snapshotAt.toISOString(),
        lastIncludedHistoryAt: lastIncludedHistoryAt.toISOString(),
        historyCount: 120,
        fileSizeBytes: 2048,
        imagePath: `/api/v1/canvas/9/snapshots/${snapshotAt.getTime()}.png`,
      },
    ]);
    expect(vi.mocked(getSnapshots)).toHaveBeenCalledWith({
      canvasId: 9,
      from: undefined,
      to: undefined,
    });
  });

  it("serves a snapshot image by timestamp", async () => {
    const tempDirectory = fs.mkdtempSync(
      path.join(os.tmpdir(), "canvas-snapshot-"),
    );
    const snapshotPath = path.join(tempDirectory, "snapshot-1.png");
    fs.writeFileSync(snapshotPath, "png-bytes");
    const snapshotAt = new Date("2026-05-01T00:10:00.000Z");

    vi.mocked(getSnapshotManifestService).mockResolvedValueOnce({
      image_path: snapshotPath,
    } as never);

    const app = createApp();
    const response = await request(app).get(
      `/api/v1/canvas/9/snapshots/${snapshotAt.getTime()}.png`,
    );

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("image/png");
    const responseBuffer =
      Buffer.isBuffer(response.body) ?
        response.body
      : Buffer.from(response.text);
    expect(responseBuffer.toString()).toBe("png-bytes");
    expect(vi.mocked(getSnapshotManifestService)).toHaveBeenCalledWith(
      9,
      snapshotAt,
    );
  });
});
