import { CanvasPlaceState } from "@blurple-canvas-web/types";
import { testPrisma as prisma } from "../database";

// Only use 2 canvases for testing purposes
const testCanvas = {
  width: 2,
  height: 2,
  startCoordinates: [1, 1],
};

export async function seedCanvases() {
  await prisma.canvas.create({
    data: {
      ...testCanvas,
      id: 1,
      name: "Unlocked Canvas",
      placeState: CanvasPlaceState.Anyone,
      eventId: 1,
      cooldownLength: 30,
    },
  });
  await prisma.canvas.create({
    data: {
      ...testCanvas,
      id: 9,
      name: "Locked Canvas",
      placeState: CanvasPlaceState.NoOne,
      eventId: 9,
    },
  });
}
