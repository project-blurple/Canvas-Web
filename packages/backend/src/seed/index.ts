import console from "node:console";
import { performance } from "node:perf_hooks";
import process from "node:process";
import { parseArgs } from "node:util";
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
  "web_guild",
] as const;
type Seeding = (typeof allSeedings)[number];

const { values: parametersValues } = parseArgs({
  options: {
    seedings: {
      type: "string",
      multiple: true,
      short: "s",
      default: Object.values(allSeedings),
    },
    overwrite: {
      type: "boolean",
      short: "o",
      default: false,
    },
  },
});

const seedings = new Set<Seeding>(
  allSeedings.filter((seeding) => parametersValues.seedings.includes(seeding)),
);

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

console.log(
  "Database",
  seedings.size,
  "seedings started. Overwrite:",
  parametersValues.overwrite,
);

async function main() {
  logWithTiming("Starting database seed");

  async function countRecords(seeding: Seeding): Promise<number> {
    switch (seeding) {
      case "guild":
        return prisma.guild.count({
          where: { id: { not: 0 } },
        });
      case "history":
        return prisma.history.count({
          where: {
            erased_at: null,
          },
        });
      case "web_guild":
        return prisma.guild.count({
          where: { id: 0 },
        });
      default:
        return await prisma[seeding].count();
    }
  }

  if (!parametersValues.overwrite) {
    for (const seeding of seedings) {
      const count = await countRecords(seeding);

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

  const seedingOrder = [
    "user",
    "discord_user_profile",
    "discord_guild_record",
    "web_guild",
    "guild",
    "color",
    "event",
    "info",
    "canvas",
    "participation",
    "frame",
    "pixel",
    "history",
  ] as const satisfies Seeding[];

  await runSeedingStep("cleanup", async () => {
    const invertedSeedingOrder = [...seedingOrder].reverse();
    const sortedSeedings = Array.from(seedings).sort(
      (a, b) =>
        invertedSeedingOrder.indexOf(a) - invertedSeedingOrder.indexOf(b),
    );

    for (const seeding of sortedSeedings) {
      switch (seeding) {
        case "guild":
          return prisma.guild.deleteMany({
            where: { id: { not: 0 } },
          });
        case "web_guild":
          return prisma.guild.delete({
            where: { id: 0 },
          });
        default:
          return prisma[seeding].deleteMany();
      }
    }
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
    web_guild: async () => {
      await prisma.guild.create({
        data: { id: 0 },
      });
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
