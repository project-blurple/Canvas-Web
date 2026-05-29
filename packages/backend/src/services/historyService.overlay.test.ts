import { prisma } from "@/client";
import { getPixelHistorySummary } from "./historyService";

vi.mock("@/client", async () => {
  const actual = await vi.importActual<typeof import("@/client")>("@/client");

  return {
    ...actual,
    prisma: {
      ...actual.prisma,
      $queryRaw: vi.fn(),
    },
  };
});

vi.mock("./pixelService", () => ({
  validatePixel: vi.fn(async () => {}),
  restorePixelsAfterHistoryModification: vi.fn(async () => {}),
}));

vi.mock("./paletteService", () => ({
  toPaletteColorSummary: vi.fn((color) => color),
}));

vi.mock("./blocklistService", () => ({
  addUsersToBlocklist: vi.fn(async () => {}),
}));

describe("getPixelHistorySummary overlay pixels", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("omits overlay pixels when no complex filters are applied", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([
      {
        id: 1n,
        color_id: 2,
        timestamp: new Date("2026-01-01T00:00:00.000Z"),
        guild_id: null,
        user_id: 7n,
        color_code: "blue",
        color_name: "Blue",
        color_rgba: [0, 0, 255, 255],
        color_emoji_name: null,
        color_emoji_id: null,
        color_global: true,
        profile_user_id: null,
        username: null,
        profile_picture_url: null,
        total_count: 1n,
      },
    ]);

    const history = await getPixelHistorySummary({
      canvasId: 1,
      points: { x: 3, y: 4 },
    });

    expect(history.overlayPixels).toBeUndefined();
    expect(vi.mocked(prisma.$queryRaw)).toHaveBeenCalledTimes(1);
  });

  it("includes the latest color for each coordinate when filters are applied", async () => {
    vi.mocked(prisma.$queryRaw)
      .mockResolvedValueOnce([
        {
          id: 11n,
          color_id: 3,
          timestamp: new Date("2026-01-02T00:00:00.000Z"),
          guild_id: null,
          user_id: 7n,
          color_code: "red",
          color_name: "Red",
          color_rgba: [234, 35, 40, 255],
          color_emoji_name: null,
          color_emoji_id: null,
          color_global: false,
          profile_user_id: null,
          username: null,
          profile_picture_url: null,
          total_count: 2n,
        },
      ])
      .mockResolvedValueOnce([
        { x: 3, y: 4, color_id: 3 },
        { x: 5, y: 6, color_id: 2 },
      ]);

    const history = await getPixelHistorySummary(
      {
        canvasId: 1,
        points: [
          { x: 3, y: 4 },
          { x: 5, y: 6 },
        ],
        userIdFilter: {
          ids: [7n],
          include: true,
        },
      },
      false,
    );

    expect(history.overlayPixels).toEqual([
      { x: 3, y: 4, colorId: 3 },
      { x: 5, y: 6, colorId: 2 },
    ]);
    expect(vi.mocked(prisma.$queryRaw)).toHaveBeenCalledTimes(2);
  });
});
