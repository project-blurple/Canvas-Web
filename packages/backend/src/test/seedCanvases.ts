import { CanvasPlaceState } from "@blurple-canvas-web/types";
import { prisma } from "@/client";

// Only use 2 canvases for testing purposes
const testCanvas = {
  width: 2,
  height: 2,
  start_coordinates: [1, 1],
};

export default async function () {
  await prisma.canvas.create({
    data: {
      ...testCanvas,
      id: 1,
      name: "Unlocked Canvas",
      place_state: CanvasPlaceState.Anyone,
      event_id: 1,
      cooldown_length: 30,
    },
  });
  await prisma.canvas.create({
    data: {
      ...testCanvas,
      id: 9,
      name: "Locked Canvas",
      place_state: CanvasPlaceState.NoOne,
      event_id: 9,
    },
  });
}
