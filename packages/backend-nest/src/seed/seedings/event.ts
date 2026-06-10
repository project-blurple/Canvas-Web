import { eventSeedData } from "../data/events";
import type { Seeding } from "./types";

export const eventSeeding: Seeding = {
  name: "event",
  count: (prisma) => prisma.event.count(),
  async clean(prisma) {
    await prisma.event.deleteMany();
  },
  async seed(prisma) {
    await prisma.event.createMany({ data: [...eventSeedData] });
  },
};
