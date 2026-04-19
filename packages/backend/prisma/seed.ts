import console from "node:console";
import process from "node:process";
import { PrismaPg } from "@prisma/adapter-pg";
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
} from "./seedData/index.ts";

const prisma = new PrismaClient({
  adapter: new PrismaPg(process.env.DATABASE_URL ?? ""),
});

const seedStartedAt = Date.now();

function logWithTiming(message: string): void {
  const elapsedMs = Date.now() - seedStartedAt;
  console.log(`[+${elapsedMs}ms] ${message}`);
}

async function runSeedingStep(
  step: string,
  action?: () => Promise<void>,
): Promise<void> {
  const startedAt = Date.now();
  logWithTiming(`Seeding ${step}...`);
  if (action) await action();
  logWithTiming(`Seeded ${step} (${Date.now() - startedAt}ms)`);
}

const overwriteArg = process.argv.find((arg) => arg.startsWith("--overwrite="));
const OVERWRITE = overwriteArg?.split("=")[1] === "true";

console.log(`Database seeding started. OVERWRITE=${OVERWRITE}`);

async function main() {
  logWithTiming("Starting database seed");

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

  if (!OVERWRITE)
    for (const seeding of seedings) {
      const count = (await prisma[seeding].count()) as
        | number
        | undefined
        | null;
      if (count && count >= 1) seedings.splice(seedings.indexOf(seeding), 1);
    }

  if (seedings.length === 0) {
    logWithTiming("No seedings to run");
    return;
  }

  logWithTiming(`Seedings to run: ${seedings.join(", ")}`);

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
  await runSeedingStep("cleanup", async () => {
    await prisma.$transaction([
      ...seedings
        .sort((a, b) => order.indexOf(a) - order.indexOf(b))
        .map((seeding) => prisma[seeding].deleteMany()),
    ]);
  });

  const userData = discordUserProfileSeedData();

  // === DISCORD_USER_PROFILE ===
  if (seedings.includes("discord_user_profile")) {
    await runSeedingStep("discord_user_profile", async () => {
      await prisma.discord_user_profile.createMany({
        data: userData,
      });
    });
  }

  // ====== User and Guild data ======

  // USER
  if (seedings.includes("user")) {
    await runSeedingStep("user", async () => {
      await prisma.user.createMany({ data: userSeedData(userData) });
    });
  }

  // DISCORD_GUILD_RECORD
  if (seedings.includes("discord_guild_record")) {
    await runSeedingStep("discord_guild_record", async () => {
      await prisma.discord_guild_record.createMany({
        data: discordGuildRecordSeedData(),
      });
    });
  }

  // GUILD
  if (seedings.includes("guild")) {
    await runSeedingStep("guild", async () => {
      await prisma.guild.createMany({ data: guildSeedData() });
    });
  }

  // ====== Color data ======

  // COLOR
  if (seedings.includes("color")) {
    await runSeedingStep("color", async () => {
      await prisma.color.createMany({ data: colorSeedData });
    });
  }

  // ====== Event data ======

  // EVENT
  if (seedings.includes("event")) {
    await runSeedingStep("event", async () => {
      await prisma.event.createMany({ data: eventSeedData });
    });
  }

  // INFO
  if (seedings.includes("info")) {
    await runSeedingStep("info", async () => {
      await prisma.info.create({ data: infoSeedData });
    });
  }

  // CANVAS
  if (seedings.includes("canvas")) {
    await runSeedingStep("canvas", async () => {
      await prisma.canvas.createMany({ data: canvasSeedData });
    });
  }

  // PARTICIPATION
  if (seedings.includes("participation")) {
    await runSeedingStep("participation", async () => {
      await prisma.participation.createMany({ data: participationSeedData() });
    });
  }

  // ====== Frame data ======

  // FRAME
  if (seedings.includes("frame")) {
    await runSeedingStep("frame", async () => {
      await prisma.frame.createMany({ data: frameSeedData });
    });
  }

  // ====== Pixel data ======

  // PIXEL
  if (seedings.includes("pixel")) {
    await runSeedingStep("pixel", async () => {
      await prisma.pixel.createMany({ data: pixelSeedData() });
    });
  }

  // HISTORY
  if (seedings.includes("history")) {
    await runSeedingStep("history", async () => {
      await prisma.history.createMany({ data: historySeedData() });
    });
  }

  logWithTiming("Database seed completed");
}

main()
  .then(async () => await prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
