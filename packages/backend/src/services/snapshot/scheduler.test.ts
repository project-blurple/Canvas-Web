import { afterEach, describe, expect, it, vi } from "vitest";

const { unlinkMock, findManyMock, deleteManyMock } = vi.hoisted(() => ({
  unlinkMock: vi.fn(async () => undefined),
  findManyMock: vi.fn(),
  deleteManyMock: vi.fn(),
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

vi.mock("node:fs/promises", () => ({
  mkdir: vi.fn(),
  unlink: unlinkMock,
  writeFile: vi.fn(),
}));

vi.mock("@/client/snapshots", () => ({
  snapshotPrisma: {
    timelapse_manifest: {
      findMany: findManyMock,
      deleteMany: deleteManyMock,
    },
  },
}));

// Now safe to import after mocking dependencies
import { evictStaleInvalidatedTimelapses } from "./scheduler";

describe("scheduler eviction", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("does nothing when there are no stale invalidated timelapse manifests", async () => {
    findManyMock.mockResolvedValue([]);

    await evictStaleInvalidatedTimelapses();

    expect(findManyMock).toHaveBeenCalledOnce();
    expect(unlinkMock).not.toHaveBeenCalled();
    expect(deleteManyMock).not.toHaveBeenCalled();
  });

  it("deletes stale invalidated timelapse files and removes their manifests", async () => {
    findManyMock.mockResolvedValue([
      { id: 1, file_path: "/tmp/timelapse-1.mp4" },
      { id: 2, file_path: "/tmp/timelapse-2.mp4" },
    ]);
    deleteManyMock.mockResolvedValue({ count: 2 });

    await evictStaleInvalidatedTimelapses();

    expect(unlinkMock).toHaveBeenCalledTimes(2);
    expect(unlinkMock).toHaveBeenNthCalledWith(1, "/tmp/timelapse-1.mp4");
    expect(unlinkMock).toHaveBeenNthCalledWith(2, "/tmp/timelapse-2.mp4");
    expect(deleteManyMock).toHaveBeenCalledWith({
      where: {
        id: { in: [1, 2] },
      },
    });
  });

  it("continues deleting manifests even when file unlink fails", async () => {
    findManyMock.mockResolvedValue([
      { id: 3, file_path: "/tmp/invalid-timelapse.mp4" },
    ]);
    unlinkMock.mockRejectedValue(new Error("unable to delete file"));
    deleteManyMock.mockResolvedValue({ count: 1 });

    await expect(evictStaleInvalidatedTimelapses()).resolves.not.toThrow();

    expect(unlinkMock).toHaveBeenCalledOnce();
    expect(deleteManyMock).toHaveBeenCalledWith({
      where: {
        id: { in: [3] },
      },
    });
  });
});
