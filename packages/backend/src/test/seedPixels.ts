import { prisma } from "@/client";

export default async function () {
  // Initialise both canvases of size 4 to have the same pixel arrangement of:
  // [ 1, 2 ]
  // [ 3, 1 ]
  await prisma.pixel.createMany({
    data: [
      {
        canvas_id: 1,
        x: 0,
        y: 0,
        color_id: 1,
      },
      {
        canvas_id: 1,
        x: 1,
        y: 0,
        color_id: 2,
      },
      {
        canvas_id: 1,
        x: 0,
        y: 1,
        color_id: 3,
      },
      {
        canvas_id: 1,
        x: 1,
        y: 1,
        color_id: 1,
      },
      {
        canvas_id: 9,
        x: 0,
        y: 0,
        color_id: 1,
      },
      {
        canvas_id: 9,
        x: 1,
        y: 0,
        color_id: 2,
      },
      {
        canvas_id: 9,
        x: 0,
        y: 1,
        color_id: 3,
      },
      {
        canvas_id: 9,
        x: 1,
        y: 1,
        color_id: 1,
      },
    ],
  });
}
