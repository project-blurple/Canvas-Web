import console from "node:console";
import { performance } from "node:perf_hooks";
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
  historySeedDataBatches,
  infoSeedData,
  participationSeedData,
  pixelSeedDataBatches,
  userSeedData,
} from "./seedData/index.ts";

const prisma = new PrismaClient({
  adapter: new PrismaPg(process.env.DATABASE_URL ?? ""),
});

const seedStartedAt = performance.now();

function logWithTiming(message: string): void {
  const elapsedMs = Math.round(performance.now() - seedStartedAt);
  console.log(`[+${elapsedMs}ms] ${message}`);
}

async function runSeedingStep(
  step: string,
  action?: () => Promise<void>,
): Promise<void> {
  const startedAt = performance.now();
  logWithTiming(`Seeding ${step}...`);
  await action?.();
  logWithTiming(
    `Seeded ${step} (${Math.round(performance.now() - startedAt)}ms)`,
  );
}

const overwriteArg = process.argv.find((arg) => arg.startsWith("--overwrite="));
const OVERWRITE = overwriteArg?.split("=")[1] === "true";

console.log(`Database seeding started. OVERWRITE=${OVERWRITE}`);

async function main() {
  logWithTiming("Starting database seed");

  const allSeedings = [
    "canvas",
    "color",
    "discord_guild_record",
    "discord_user_profile",
    "event",
    "frame",
    "guild",
    "history",
    "info",
    "participation",
    "pixel",
    "user",
  ] as const;
  type Seeding = (typeof allSeedings)[number];
  const seedings = new Set<Seeding>(allSeedings);

  if (!OVERWRITE) {
    for (const seeding of allSeedings) {
      const count = await prisma[seeding].count();
      if (count && count >= 1) {
        seedings.delete(seeding);
      }
    }
  }

  if (seedings.size === 0) {
    logWithTiming("No seedings to run");
    return;
  }

  const formatter = new Intl.ListFormat();
  logWithTiming(`Seedings to run: ${formatter.format(Array.from(seedings))}`);

  const order: Seeding[] = [
    "pixel",
    "participation",
    "info",
    "history",
    "guild",
    "frame",
    "canvas",
    "user",
    "event",
    "discord_guild_record",
    "discord_user_profile",
    "color",
  ];
  await runSeedingStep("cleanup", async () => {
    const sortedSeedings = Array.from(seedings).sort(
      (a, b) => order.indexOf(a) - order.indexOf(b),
    );
    await prisma.$transaction(
      sortedSeedings.map((seeding) => prisma[seeding].deleteMany()),
    );
  });

  const userData = discordUserProfileSeedData();

  // === DISCORD_USER_PROFILE ===
  if (seedings.has("discord_user_profile")) {
    await runSeedingStep("discord_user_profile", async () => {
      await prisma.discord_user_profile.createMany({
        data: userData,
      });
    });
  }

  // ====== User and Guild data ======

  // USER
  if (seedings.has("user")) {
    await runSeedingStep("user", async () => {
      await prisma.user.createMany({ data: userSeedData(userData) });
    });
  }

  // DISCORD_GUILD_RECORD
  if (seedings.has("discord_guild_record")) {
    await runSeedingStep("discord_guild_record", async () => {
      await prisma.discord_guild_record.createMany({
        data: discordGuildRecordSeedData(),
      });
    });
  }

  // GUILD
  if (seedings.has("guild")) {
    await runSeedingStep("guild", async () => {
      await prisma.guild.createMany({ data: guildSeedData() });
    });
  }

  // ====== Color data ======

  // COLOR
  if (seedings.has("color")) {
    await runSeedingStep("color", async () => {
      await prisma.color.createMany({ data: colorSeedData });
    });
  }

  // ====== Event data ======

  // EVENT
  if (seedings.has("event")) {
    await runSeedingStep("event", async () => {
      await prisma.event.createMany({ data: eventSeedData });
    });
  }

  // INFO
  if (seedings.has("info")) {
    await runSeedingStep("info", async () => {
      await prisma.info.create({ data: infoSeedData });
    });
  }

  // CANVAS
  if (seedings.has("canvas")) {
    await runSeedingStep("canvas", async () => {
      await prisma.canvas.createMany({ data: canvasSeedData });
    });
  }

  // PARTICIPATION
  if (seedings.has("participation")) {
    await runSeedingStep("participation", async () => {
      await prisma.participation.createMany({ data: participationSeedData() });
    });
  }

  // ====== Frame data ======

  // FRAME
  if (seedings.has("frame")) {
    await runSeedingStep("frame", async () => {
      await prisma.frame.createMany({ data: frameSeedData });
    });
  }

  // ====== Pixel data ======

  // PIXEL
  if (seedings.has("pixel")) {
    await runSeedingStep("pixel", async () => {
      for await (const batch of pixelSeedDataBatches()) {
        await prisma.pixel.createMany({ data: batch });
      }
    });
  }

  // HISTORY
  if (seedings.has("history")) {
    await runSeedingStep("history", async () => {
      for await (const batch of historySeedDataBatches()) {
        await prisma.history.createMany({ data: batch });
      }
    });
  }

  logWithTiming("Database seed completed");
}

try {
  await main();
  await prisma.$disconnect();
} catch (e) {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
}
