import { testPrisma as prisma } from "../database";

export async function seedPixels() {
  // Initialise both canvases of size 4 to have the same pixel arrangement of:
  // [ 1, 2 ]
  // [ 3, 1 ]
  await prisma.pixel.createMany({
    data: [
      { canvasId: 1, x: 0, y: 0, colorId: 1 },
      { canvasId: 1, x: 1, y: 0, colorId: 2 },
      { canvasId: 1, x: 0, y: 1, colorId: 3 },
      { canvasId: 1, x: 1, y: 1, colorId: 1 },
      { canvasId: 9, x: 0, y: 0, colorId: 1 },
      { canvasId: 9, x: 1, y: 0, colorId: 2 },
      { canvasId: 9, x: 0, y: 1, colorId: 3 },
      { canvasId: 9, x: 1, y: 1, colorId: 1 },
    ],
  });
}
