import { colorSeedData } from "../data/colors";
import type { Seeding } from "./types";

export const colorSeeding: Seeding = {
  name: "color",
  count: (prisma) => prisma.color.count(),
  async clean(prisma) {
    await prisma.color.deleteMany();
  },
  async seed(prisma) {
    await prisma.color.createMany({ data: [...colorSeedData] });
  },
};
