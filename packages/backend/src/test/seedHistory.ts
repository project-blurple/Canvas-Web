import { prisma } from "@/client";

const repeatedHistory = {
  color_id: 1,
  x: 0,
  y: 0,
  user_id: 1,
};

export default async function () {
  // Add some history to both canvases, while making sure it is consistent with the pixels
  // They're all being placed by user_id: 1 with 6 pixels on canvas 1 and 6 pixels on canvas 2.
  await prisma.history.createMany({
    data: [
      { ...repeatedHistory, timestamp: new Date(1), canvas_id: 1 },
      { ...repeatedHistory, timestamp: new Date(2), canvas_id: 1 },
      { ...repeatedHistory, timestamp: new Date(3), canvas_id: 1 },
      { ...repeatedHistory, timestamp: new Date(4), canvas_id: 9 },
      { ...repeatedHistory, timestamp: new Date(5), canvas_id: 9 },
      { ...repeatedHistory, timestamp: new Date(6), canvas_id: 9 },
      {
        user_id: 1,
        canvas_id: 1,
        x: 0,
        y: 0,
        color_id: 1,
        timestamp: new Date(7),
      },
      {
        user_id: 1,
        canvas_id: 1,
        x: 1,
        y: 0,
        color_id: 2,
        timestamp: new Date(8),
      },
      {
        user_id: 1,
        canvas_id: 1,
        x: 0,
        y: 1,
        color_id: 3,
        timestamp: new Date(9),
      },
      {
        user_id: 1,
        canvas_id: 9,
        x: 0,
        y: 0,
        color_id: 1,
        timestamp: new Date(10),
      },
      {
        user_id: 1,
        canvas_id: 9,
        x: 1,
        y: 0,
        color_id: 2,
        timestamp: new Date(11),
      },
      {
        user_id: 1,
        canvas_id: 9,
        x: 0,
        y: 1,
        color_id: 3,
        timestamp: new Date(12),
      },
    ],
  });
}
