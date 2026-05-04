import console from "node:console";
import { performance } from "node:perf_hooks";
import process from "node:process";
import { PrismaPg } from "@prisma/adapter-pg";
// @ts-expect-error Runtime uses built JS Prisma client; no declaration file is emitted.
import { PrismaClient } from "../../build/client/generated/client.js";
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
  // @ts-expect-error Node strip-types runtime needs explicit .ts extension.
} from "./data/index.ts";

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

  async function countRecords(seeding: Seeding): Promise<number> {
    switch (seeding) {
      case "canvas":
        return prisma.canvas.count();
      case "color":
        return prisma.color.count();
      case "discord_guild_record":
        return prisma.discord_guild_record.count();
      case "discord_user_profile":
        return prisma.discord_user_profile.count();
      case "event":
        return prisma.event.count();
      case "frame":
        return prisma.frame.count();
      case "guild":
        return prisma.guild.count();
      case "history":
        return prisma.history.count();
      case "info":
        return prisma.info.count();
      case "participation":
        return prisma.participation.count();
      case "pixel":
        return prisma.pixel.count();
      case "user":
        return prisma.user.count();
    }
  }

  if (!OVERWRITE) {
    Promise.all(
      allSeedings.map(async (seeding) => {
        const count = await countRecords(seeding);
        if (count && count >= 1) {
          seedings.delete(seeding);
        }
      }),
    );
  }

  if (seedings.size === 0) {
    logWithTiming("No seedings to run");
    return;
  }

  const formatter = new Intl.ListFormat();
  logWithTiming(`Seedings to run: ${formatter.format(Array.from(seedings))}`);

  const cleanupOrder: Seeding[] = [
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
      (a, b) => cleanupOrder.indexOf(a) - cleanupOrder.indexOf(b),
    );
    await prisma.$transaction(
      sortedSeedings.map((seeding) => prisma[seeding].deleteMany()),
    );
  });

  const userData = discordUserProfileSeedData();
  const seedingActions: Record<Seeding, () => Promise<void>> = {
    canvas: async () => {
      await prisma.canvas.createMany({ data: canvasSeedData });
    },
    color: async () => {
      await prisma.color.createMany({ data: colorSeedData });
    },
    discord_guild_record: async () => {
      await prisma.discord_guild_record.createMany({
        data: discordGuildRecordSeedData(),
      });
    },
    discord_user_profile: async () => {
      await prisma.discord_user_profile.createMany({
        data: userData,
      });
    },
    event: async () => {
      await prisma.event.createMany({ data: eventSeedData });
    },
    frame: async () => {
      await prisma.frame.createMany({ data: frameSeedData });
    },
    guild: async () => {
      await prisma.guild.createMany({ data: guildSeedData() });
    },
    history: async () => {
      for await (const batch of historySeedDataBatches()) {
        await prisma.history.createMany({ data: batch });
      }
    },
    info: async () => {
      await prisma.info.create({ data: infoSeedData });
    },
    participation: async () => {
      await prisma.participation.createMany({ data: participationSeedData() });
    },
    pixel: async () => {
      for await (const batch of pixelSeedDataBatches()) {
        await prisma.pixel.createMany({ data: batch });
      }
    },
    user: async () => {
      await prisma.user.createMany({ data: userSeedData(userData) });
    },
  };

  const seedingOrder: Seeding[] = [
    "user",
    "guild",
    "discord_user_profile",
    "discord_guild_record",
    "color",
    "event",
    "info",
    "canvas",
    "participation",
    "frame",
    "pixel",
    "history",
  ];

  for (const seeding of seedingOrder) {
    if (!seedings.has(seeding)) {
      continue;
    }
    await runSeedingStep(seeding, seedingActions[seeding]);
  }

  logWithTiming("Database seed completed");
}

(async () => {
  try {
    await main();
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
