import { infoSeedData } from "../data/events";
import type { Seeding } from "./types";

export const infoSeeding: Seeding = {
  name: "info",
  count: (prisma) => prisma.info.count(),
  async clean(prisma) {
    await prisma.info.deleteMany();
  },
  async seed(prisma) {
    await prisma.info.create({ data: infoSeedData });
  },
};
