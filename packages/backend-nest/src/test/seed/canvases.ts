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
      locked: false,
      eventId: 1,
      cooldownLength: 30,
    },
  });
  await prisma.canvas.create({
    data: {
      ...testCanvas,
      id: 9,
      name: "Locked Canvas",
      locked: true,
      eventId: 9,
    },
  });
}
