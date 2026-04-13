import { prisma } from "@/client";

export default async function () {
  await prisma.discord_guild_record.createMany({
    data: [
      { guild_id: 0, name: "Web" },
      { guild_id: 1, name: "Guild 1" },
      { guild_id: 9, name: "Guild 9" },
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
