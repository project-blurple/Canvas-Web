import type { Prisma } from "../../common/database/core/prisma.client";
import { colorSeedData } from "./colors";

const generatedGuildCount = 12;

export function guildSeedData(): Prisma.GuildCreateManyInput[] {
  const guilds: Prisma.GuildCreateManyInput[] = [
    {
      id: 412754940885467146n,
      managerRole: 708540954302218311n,
      invite: "project-blurple-412754940885467146",
    },
    {
      id: 281648235557421056n,
      managerRole: 1328964907420356608n,
      invite: "marvel",
    },
  ];

  for (let i = 0; i < generatedGuildCount; i++) {
    guilds.push({
      id: BigInt(1001 + i),
    });
  }

  return guilds;
}

export function discordGuildRecordSeedData(): Prisma.DiscordGuildRecordCreateManyInput[] {
  const guilds: Prisma.DiscordGuildRecordCreateManyInput[] = [
    {
      guildId: 412754940885467146n,
      name: "Project Blurple",
    },
    {
      guildId: 281648235557421056n,
      name: "Marvel Discord",
    },
  ];

  for (let i = 0; i < generatedGuildCount; i++) {
    guilds.push({
      guildId: BigInt(1001 + i),
      name: `Guild ${i + 1}`,
    });
  }

  return guilds;
}

export function participationSeedData(): Prisma.ParticipationCreateManyInput[] {
  const participations: Prisma.ParticipationCreateManyInput[] = [
    {
      guildId: 281648235557421056n,
      eventId: 2024,
      colorId: 24, // Marvel Red
    },
  ];

  const colorIds = colorSeedData
    .filter(
      (color) =>
        !color.global &&
        !participations.some(
          // filtering out the ones already hardcoded above
          (participation) => participation.colorId === color.id,
        ),
    )
    .map((color) => color.id);

  for (let i = 0; i < colorIds.length; i++) {
    participations.push({
      guildId: BigInt(1001 + (i % generatedGuildCount)),
      eventId: 2024,
      colorId: colorIds[i],
    });
  }

  return participations;
}
