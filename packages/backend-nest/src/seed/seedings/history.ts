import { historySeedDataBatches } from "../data/pixels";
import type { Seeding } from "./types";

export const historySeeding: Seeding = {
  name: "history",
  count: (prisma) => prisma.history.count({ where: { erasedAt: null } }),
  async clean(prisma) {
    await prisma.history.deleteMany();
  },
  async seed(prisma) {
    for await (const batch of historySeedDataBatches()) {
      await prisma.history.createMany({ data: batch });
    }
  },
};
