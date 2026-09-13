import console from "node:console";
import { performance } from "node:perf_hooks";
import process from "node:process";
import { parseArgs } from "node:util";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../common/database/core/prisma.client";
import { type Seeding, seedings } from "./seedings";

const allSeedingNames = seedings.map((seeding) => seeding.name);

const { values: parametersValues } = parseArgs({
  args: process.argv.slice(2).filter((arg) => arg !== "--"),
  options: {
    seedings: {
      type: "string",
      multiple: true,
      short: "s",
      default: allSeedingNames,
    },
    overwrite: {
      type: "boolean",
      short: "o",
      default: false,
    },
  },
});

const selected = new Set<Seeding>(
  seedings.filter((seeding) =>
    parametersValues.seedings.includes(seeding.name),
  ),
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
  selected.size,
  "seedings started. Overwrite:",
  parametersValues.overwrite,
);

async function main() {
  logWithTiming("Starting database seed");

  if (!parametersValues.overwrite) {
    for (const seeding of selected) {
      const count = await seeding.count(prisma);

      if (count >= 1) {
        selected.delete(seeding);
      }
    }
  }

  if (selected.size === 0) {
    logWithTiming("No seedings to run");
    return;
  }

  const formatter = new Intl.ListFormat();
  logWithTiming(
    `Seedings to run: ${formatter.format(
      Array.from(selected, (seeding) => seeding.name),
    )}`,
  );

  await runSeedingStep("cleanup", async () => {
    // Reverse seeding order, to respect foreign key constraints.
    for (const seeding of seedings.toReversed()) {
      if (selected.has(seeding)) {
        await seeding.clean(prisma);
      }
    }
  });

  for (const seeding of seedings) {
    if (!selected.has(seeding)) {
      continue;
    }
    await runSeedingStep(seeding.name, () => seeding.seed(prisma));
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
