import { prisma } from "@/client";

export default async function () {
  await prisma.event.createMany({
    data: [
      { id: 1, name: "Current Event" },
      { id: 9, name: "Past Event" },
    ],
  });
}
