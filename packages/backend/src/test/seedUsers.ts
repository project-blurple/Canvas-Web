import { prisma } from "../client";

export default async function seedUsers() {
  await prisma.user.createMany({
    data: [
      { id: 1n },
      { id: 9n },
      { id: 204778476102877187n },
      { id: 201892070091128832n },
    ],
  });
}
