import { pixelSeedDataBatches } from "../data/pixels";
import type { Seeding } from "./types";

export const pixelSeeding: Seeding = {
  name: "pixel",
  count: (prisma) => prisma.pixel.count(),
  async clean(prisma) {
    await prisma.pixel.deleteMany();
  },
  async seed(prisma) {
    for await (const batch of pixelSeedDataBatches()) {
      await prisma.pixel.createMany({ data: batch });
    }
  },
};
