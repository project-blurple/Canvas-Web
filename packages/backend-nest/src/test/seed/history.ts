import { testPrisma as prisma } from "../database";

const repeatedHistory = {
  colorId: 1,
  x: 0,
  y: 0,
  userId: 1,
};

export async function seedHistory() {
  // Add some history to both canvases, while making sure it is consistent with the pixels
  // They're all being placed by userId: 1 with 6 pixels on canvas 1 and 6 pixels on canvas 2.
  await prisma.history.createMany({
    data: [
      { ...repeatedHistory, timestamp: new Date(1), canvasId: 1 },
      { ...repeatedHistory, timestamp: new Date(2), canvasId: 1 },
      { ...repeatedHistory, timestamp: new Date(3), canvasId: 1 },
      { ...repeatedHistory, timestamp: new Date(4), canvasId: 9 },
      { ...repeatedHistory, timestamp: new Date(5), canvasId: 9 },
      { ...repeatedHistory, timestamp: new Date(6), canvasId: 9 },
      {
        userId: 1,
        canvasId: 1,
        x: 0,
        y: 0,
        colorId: 1,
        timestamp: new Date(7),
      },
      {
        userId: 1,
        canvasId: 1,
        x: 1,
        y: 0,
        colorId: 2,
        timestamp: new Date(8),
      },
      {
        userId: 1,
        canvasId: 1,
        x: 0,
        y: 1,
        colorId: 3,
        timestamp: new Date(9),
      },
      {
        userId: 1,
        canvasId: 9,
        x: 0,
        y: 0,
        colorId: 1,
        timestamp: new Date(10),
      },
      {
        userId: 1,
        canvasId: 9,
        x: 1,
        y: 0,
        colorId: 2,
        timestamp: new Date(11),
      },
      {
        userId: 1,
        canvasId: 9,
        x: 0,
        y: 1,
        colorId: 3,
        timestamp: new Date(12),
      },
    ],
  });
}
