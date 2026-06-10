import { testPrisma as prisma } from "../database";

export async function seedGuilds() {
  await prisma.discordGuildRecord.createMany({
    data: [
      { guildId: 0, name: "Web" },
      { guildId: 1, name: "Guild 1" },
      { guildId: 9, name: "Guild 9" },
    ],
  });
  await prisma.guild.createMany({
    data: [
      { id: 0, invite: "web" },
      { id: 1, invite: "Guild 1" },
      { id: 9, invite: "Guild 9" },
    ],
  });
}
