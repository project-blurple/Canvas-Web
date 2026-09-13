import { testPrisma as prisma } from "../database";

export async function seedEvents() {
  await prisma.event.createMany({
    data: [
      { id: 1, name: "Current Event" },
      { id: 9, name: "Past Event" },
    ],
  });
}
