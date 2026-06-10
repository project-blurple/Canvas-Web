import { frameSeedData } from "../data/frames";
import type { Seeding } from "./types";

export const frameSeeding: Seeding = {
  name: "frame",
  count: (prisma) => prisma.frame.count(),
  async clean(prisma) {
    await prisma.frame.deleteMany();
  },
  async seed(prisma) {
    await prisma.frame.createMany({ data: [...frameSeedData] });
  },
};
