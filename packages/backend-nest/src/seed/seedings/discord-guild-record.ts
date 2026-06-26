import { discordGuildRecordSeedData } from "../data/guilds";
import type { Seeding } from "./types";

export const discordGuildRecordSeeding: Seeding = {
  name: "discord_guild_record",
  count: (prisma) => prisma.discordGuildRecord.count(),
  async clean(prisma) {
    await prisma.discordGuildRecord.deleteMany();
  },
  async seed(prisma) {
    await prisma.discordGuildRecord.createMany({
      data: discordGuildRecordSeedData(),
    });
  },
};
