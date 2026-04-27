import type { Prisma } from "../../client/generated/client";
// @ts-expect-error Node strip-types runtime needs explicit .ts extension.
import { colorSeedData } from "./colors.ts";

const generatedGuildCount = 12;

export function guildSeedData(): Prisma.guildCreateManyInput[] {
  const guilds: Prisma.guildCreateManyInput[] = [
    {
      id: 412754940885467146n,
      manager_role: 708540954302218311n,
      invite: "project-blurple-412754940885467146",
    },
    {
      id: 281648235557421056n,
      manager_role: 1328964907420356608n,
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

export function discordGuildRecordSeedData(): Prisma.discord_guild_recordCreateManyInput[] {
  const guilds: Prisma.discord_guild_recordCreateManyInput[] = [
    {
      guild_id: 412754940885467146n,
      name: "Project Blurple",
    },
    {
      guild_id: 281648235557421056n,
      name: "Marvel Discord",
    },
  ];

  for (let i = 0; i < generatedGuildCount; i++) {
    guilds.push({
      guild_id: BigInt(1001 + i),
      name: `Guild ${i + 1}`,
    });
  }

  return guilds;
}

export function participationSeedData(): Prisma.participationCreateManyInput[] {
  const participations: Prisma.participationCreateManyInput[] = [
    {
      guild_id: 281648235557421056n,
      event_id: 2024,
      color_id: 24, // Marvel Red
    },
  ];

  const colorIds = colorSeedData
    .filter(
      (color) =>
        !color.global &&
        !participations.some(
          // filtering out the ones already hardcoded above
          (participation) => participation.color_id === color.id,
        ),
    )
    .map((color) => color.id);

  for (let i = 0; i < colorIds.length; i++) {
    participations.push({
      guild_id: BigInt(1001 + (i % generatedGuildCount)),
      event_id: 2024,
      color_id: colorIds[i],
    });
  }

  return participations;
}
