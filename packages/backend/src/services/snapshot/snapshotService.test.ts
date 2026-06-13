import { afterEach, describe, expect, it, vi } from "vitest";

const { timelapseUpdateManyMock, cursorUpdateManyMock, cursorCreateMock } =
  vi.hoisted(() => ({
    timelapseUpdateManyMock: vi.fn(),
    cursorUpdateManyMock: vi.fn(),
    cursorCreateMock: vi.fn(),
  }));

// Mock app initialization and heavy dependencies to prevent full app startup
vi.mock("@/app", () => ({
  createApp: vi.fn(),
}));

vi.mock("@/services/canvasService", () => ({
  initializeCache: vi.fn(),
}));

vi.mock("@/middleware/discordAuth", () => ({
  initializeAuth: vi.fn(),
}));

vi.mock("@/middleware/ratelimit", () => ({
  default: vi.fn(),
}));

vi.mock("@/client/snapshots", () => ({
  snapshotPrisma: {
    timelapse_manifest: {
      updateMany: timelapseUpdateManyMock,
    },
    snapshot_cursor: {
      updateMany: cursorUpdateManyMock,
      create: cursorCreateMock,
    },
  },
}));

vi.mock("./snapshotPolicy", () => ({
  isSnapshotAvailableForCanvas: vi.fn(() => true),
}));

// Now safe to import after mocking dependencies
import { setSnapshotDirtyTimestamp } from "./snapshotService";

describe("snapshot dirty timestamp invalidation", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("invalidates overlapping timelapse manifests when snapshot is marked dirty", async () => {
    const canvasId = 1;
    const dirtyTime = new Date("2026-06-11T12:00:00Z");
    cursorUpdateManyMock.mockResolvedValue({ count: 1 });
    timelapseUpdateManyMock.mockResolvedValue({ count: 2 });

    await setSnapshotDirtyTimestamp(canvasId, dirtyTime);

    expect(timelapseUpdateManyMock).toHaveBeenCalledWith({
      where: {
        canvas_id: canvasId,
        effective_end_at: { gte: dirtyTime },
        invalidated_at: null,
      },
      data: {
        invalidated_at: expect.any(Date),
      },
    });
    expect(cursorCreateMock).not.toHaveBeenCalled();
  });

  it("creates a new cursor if no cursor was updated", async () => {
    const canvasId = 2;
    const dirtyTime = new Date("2026-06-11T13:00:00Z");
    cursorUpdateManyMock.mockResolvedValue({ count: 0 });
    timelapseUpdateManyMock.mockResolvedValue({ count: 1 });
    cursorCreateMock.mockResolvedValue({ id: 1 });

    await setSnapshotDirtyTimestamp(canvasId, dirtyTime);

    expect(cursorCreateMock).toHaveBeenCalledWith({
      data: {
        canvas_id: canvasId,
        dirty_from_timestamp: dirtyTime,
      },
    });
  });

  it("only invalidates manifests that have not already been invalidated", async () => {
    const canvasId = 3;
    const dirtyTime = new Date("2026-06-11T14:00:00Z");
    cursorUpdateManyMock.mockResolvedValue({ count: 1 });
    timelapseUpdateManyMock.mockResolvedValue({ count: 3 });

    await setSnapshotDirtyTimestamp(canvasId, dirtyTime);

    const callArgs = timelapseUpdateManyMock.mock.calls[0][0];
    expect(callArgs.where.invalidated_at).toEqual(null);
  });
});
