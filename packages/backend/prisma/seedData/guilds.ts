import { colorSeedData } from "./colors.ts";

const generatedGuildCount = 12;

interface GuildSeedData {
  id: bigint;
  manager_role?: bigint;
  invite?: string;
}

export function guildSeedData(): GuildSeedData[] {
  const guilds: GuildSeedData[] = [
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

interface DiscordGuildRecordSeedData {
  guild_id: bigint;
  name: string;
}

export function discordGuildRecordSeedData(): DiscordGuildRecordSeedData[] {
  const guilds: DiscordGuildRecordSeedData[] = [
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

interface ParticipationSeedData {
  guild_id: bigint;
  event_id: number;
  color_id: number;
}

export function participationSeedData(): ParticipationSeedData[] {
  const participations: ParticipationSeedData[] = [
    {
      guild_id: 281648235557421056n,
      event_id: 2024,
      color_id: 24, // Marvel Red
    },
  ];

  const colorIds = colorSeedData
    .filter((color) => !color.global)
    .filter(
      (color) =>
        !participations.some(
          // filtering out the ones already hardcoded above
          (participation) => participation.color_id === color.id,
        ),
    )
    .map((color) => color.id);

  for (let i = 0; i < colorIds.length; i++) {
    participations.push({
      guild_id: BigInt(1001 + i),
      event_id: 2024,
      color_id: colorIds[i],
    });
  }

  return participations;
}
