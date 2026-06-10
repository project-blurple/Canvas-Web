import { discordUserProfileSeedData, userSeedData } from "../data/users";
import type { Seeding } from "./types";

export const userSeeding: Seeding = {
  name: "user",
  count: (prisma) => prisma.user.count(),
  async clean(prisma) {
    await prisma.user.deleteMany();
  },
  async seed(prisma) {
    await prisma.user.createMany({
      data: userSeedData(discordUserProfileSeedData()),
    });
  },
};
