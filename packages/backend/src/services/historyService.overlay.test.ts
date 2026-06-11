import { prisma } from "@/client";
import seedAll from "@/test";
import { getPixelHistorySummary } from "./historyService";

vi.mock("@/index", () => ({
  socketHandler: {
    broadcastPixelPlacement: vi.fn(),
    broadcastPixelBulkPlacement: vi.fn(),
  },
}));

describe("getPixelHistorySummary overlay pixels", () => {
  beforeEach(async () => {
    await seedAll();
  });

  it("omits overlay pixels when no complex filters are applied", async () => {
    const history = await getPixelHistorySummary({
      canvasId: 1,
      points: { x: 0, y: 0 },
    });

    expect(history.overlayPixels).toBeUndefined();
  });

  it("includes the latest color for each coordinate when filters are applied", async () => {
    await prisma.history.create({
      data: {
        canvas_id: 1,
        user_id: 9n,
        x: 0,
        y: 0,
        color_id: 2,
        timestamp: new Date(100),
      },
    });

    const history = await getPixelHistorySummary({
      canvasId: 1,
      points: [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ],
      userIdFilter: {
        ids: [1n],
        include: true,
      },
    });

    expect(history.overlayPixels).toEqual([
      { x: 0, y: 0, colorId: 1 },
      { x: 0, y: 1, colorId: 3 },
      { x: 1, y: 0, colorId: 2 },
    ]);
    // Only user 1's six placements match the filter; user 9's placement is excluded.
    expect(history.total).toBe(6);
  });
});
