import type { Seeding } from "./types";

// Guild 0 is the pseudo-guild that pixels placed via the web are attributed to.
export const webGuildSeeding: Seeding = {
  name: "web_guild",
  count: (prisma) => prisma.guild.count({ where: { id: 0 } }),
  async clean(prisma) {
    await prisma.guild.deleteMany({ where: { id: 0 } });
  },
  async seed(prisma) {
    await prisma.guild.create({ data: { id: 0 } });
  },
};
