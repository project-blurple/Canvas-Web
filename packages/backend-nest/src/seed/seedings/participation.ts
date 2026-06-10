import { participationSeedData } from "../data/guilds";
import type { Seeding } from "./types";

export const participationSeeding: Seeding = {
  name: "participation",
  count: (prisma) => prisma.participation.count(),
  async clean(prisma) {
    await prisma.participation.deleteMany();
  },
  async seed(prisma) {
    await prisma.participation.createMany({ data: participationSeedData() });
  },
};
