import { prisma } from "@/client";
import { seedColors } from "@/test";
import { getCanvasPng } from "./canvasService";

describe("Canvas cache concurrency tests", () => {
  beforeEach(async () => {
    await seedColors();
  });

  it("deduplicates concurrent cache misses for the same canvas", async () => {
    const createdCanvas = await prisma.canvas.create({
      data: {
        name: "Concurrent Cache Canvas",
        locked: false,
        width: 2,
        height: 2,
        event_id: null,
      },
    });

    await prisma.pixel.createMany({
      data: [
        { canvas_id: createdCanvas.id, x: 0, y: 0, color_id: 1 },
        { canvas_id: createdCanvas.id, x: 1, y: 0, color_id: 1 },
        { canvas_id: createdCanvas.id, x: 0, y: 1, color_id: 1 },
        { canvas_id: createdCanvas.id, x: 1, y: 1, color_id: 1 },
      ],
    });

    const findFirstSpy = vi.spyOn(prisma.canvas, "findFirst");
    const findManySpy = vi.spyOn(prisma.pixel, "findMany");

    try {
      const [firstCanvas, secondCanvas] = await Promise.all([
        getCanvasPng(createdCanvas.id),
        getCanvasPng(createdCanvas.id),
      ]);

      expect(firstCanvas).toStrictEqual(secondCanvas);
      expect(firstCanvas.isLocked).toBe(false);
      expect(findFirstSpy).toHaveBeenCalledTimes(1);
      expect(findManySpy).toHaveBeenCalledTimes(1);
    } finally {
      await prisma.pixel.deleteMany({
        where: { canvas_id: createdCanvas.id },
      });
      await prisma.canvas.delete({
        where: { id: createdCanvas.id },
      });
    }
  });
});
