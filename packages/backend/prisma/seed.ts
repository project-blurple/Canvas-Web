// @ts-expect-error
import console from "node:console";
// @ts-expect-error
import process from "node:process";
import { PrismaClient } from "../build/client/generated/client.js";
import {
  canvasSeedData,
  colorSeedData,
  discordGuildRecordSeedData,
  discordUserProfileSeedData,
  eventSeedData,
  frameSeedData,
  guildSeedData,
  historySeedData,
  infoSeedData,
  participationSeedData,
  pixelSeedData,
  userSeedData,
} from "./seedData";

const prisma = new PrismaClient();

const OVERRIDE = true;
const USERS = 50_000 + Math.floor(Math.random() * 50_000);

async function main() {
  const allSeedings = [
    "blacklist",
    "canvas",
    "color",
    "cooldown",
    "discord_guild_record",
    "discord_user_profile",
    "event",
    "frame",
    "guild",
    "history",
    "info",
    "participation",
    "pixel",
    "session",
    "user",
  ] as const;
  type Seeding = (typeof allSeedings)[number];
  const seedings: Seeding[] = [...allSeedings];

  if (!OVERRIDE)
    for (const seeding of seedings) {
      const count = (await prisma[seeding].count()) as
        | number
        | undefined
        | null;
      if (count && count >= 1) seedings.splice(seedings.indexOf(seeding), 1);
    }

  if (seedings.length === 0) return;

  const order: Seeding[] = [
    "pixel",
    "participation",
    "info",
    "history",
    "guild",
    "frame",
    "cooldown",
    "canvas",
    "blacklist",
    "session",
    "user",
    "event",
    "discord_guild_record",
    "discord_user_profile",
    "color",
  ];
  await prisma.$transaction([
    ...seedings
      .sort((a, b) => order.indexOf(a) - order.indexOf(b))
      .map((seeding) => prisma[seeding].deleteMany()),
  ]);

  const userNumber = Math.max(51, USERS);
  const userIds = new Set<number>();
  while (userIds.size < userNumber)
    userIds.add(Math.floor(Math.random() * 900_000) + 100_000);

  const userData = discordUserProfileSeedData();

  // === COLOR ===
  if (seedings.includes("color")) {
    await prisma.color.createMany({ data: colorSeedData });
    console.log("Seeded color");
  }

  // === DISCORD_USER_PROFILE ===
  if (seedings.includes("discord_user_profile")) {
    await prisma.discord_user_profile.createMany({
      data: userData,
    });
    console.log("Seeded discord_user_profile");
  }

  // === DISCORD_GUILD_RECORD ===
  if (seedings.includes("discord_guild_record")) {
    await prisma.discord_guild_record.createMany(discordGuildRecordSeedData());
    console.log("Seeded discord_guild_record");
  }

  // === EVENT ===
  if (seedings.includes("event")) {
    await prisma.event.createMany({ data: eventSeedData });
    console.log("Seeded event");
  }

  // === USER ===
  if (seedings.includes("user")) {
    await prisma.user.createMany({ data: userSeedData(userData) });
    console.log("Seeded user");
  }

  /// === SESSION ===
  if (seedings.includes("session")) {
    // Sessions are generated dynamically based on user activity, so we don't need to seed any initial data for them
    console.log("Seeded session");
  }

  // === BLACKLIST ===
  if (seedings.includes("blacklist")) {
    // Leaving empty to start. Users can be added to the blacklist through the mod panel.
    console.log("Seeded blacklist");
  }

  // === CANVAS ===
  if (seedings.includes("canvas")) {
    await prisma.canvas.createMany({ data: canvasSeedData });
    console.log("Seeded canvas");
  }

  // === COOLDOWN ===
  if (seedings.includes("cooldown")) {
    // Cooldowns are generated dynamically based on user activity, so we don't need to seed any initial data for them
    console.log("Seeded cooldown");
  }

  // === FRAME ===
  if (seedings.includes("frame")) {
    await prisma.frame.createMany({ data: frameSeedData });
    console.log("Seeded frame");
  }

  // === GUILD ===
  if (seedings.includes("guild")) {
    await prisma.guild.createMany({ data: guildSeedData() });
    console.log("Seeded guild");
  }

  // === HISTORY ===
  if (seedings.includes("history")) {
    await prisma.history.createMany({ data: historySeedData() });
    console.log("Seeded history");
  }

  // === INFO ===
  if (seedings.includes("info")) {
    await prisma.info.create({ data: infoSeedData });
    console.log("Seeded info");
  }

  // === PARTICIPATION ===
  if (seedings.includes("participation")) {
    await prisma.participation.createMany({ data: participationSeedData() });
    console.log("Seeded participation");
  }

  // === PIXEL ===
  if (seedings.includes("pixel")) {
    await prisma.pixel.createMany({ data: pixelSeedData() });
    console.log("Seeded pixel");
  }
}

main()
  .then(async () => await prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
