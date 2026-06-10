import { guildSeedData } from "../data/guilds";
import type { Seeding } from "./types";

// Excludes guild 0, which is owned by the web_guild seeding.
export const guildSeeding: Seeding = {
  name: "guild",
  count: (prisma) => prisma.guild.count({ where: { id: { not: 0 } } }),
  async clean(prisma) {
    await prisma.guild.deleteMany({ where: { id: { not: 0 } } });
  },
  async seed(prisma) {
    await prisma.guild.createMany({ data: guildSeedData() });
  },
};
