import { discordUserProfileSeedData } from "../data/users";
import type { Seeding } from "./types";

export const discordUserProfileSeeding: Seeding = {
  name: "discord_user_profile",
  count: (prisma) => prisma.discordUserProfile.count(),
  async clean(prisma) {
    await prisma.discordUserProfile.deleteMany();
  },
  async seed(prisma) {
    await prisma.discordUserProfile.createMany({
      data: discordUserProfileSeedData(),
    });
  },
};
