import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { PrismaPg } from "@prisma/adapter-pg";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { PrismaClient } = require(
  resolve(scriptDir, "..", "build", "client", "generated", "client.js"),
);

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL must be set before running db:repair-canvas.");
}

const BLANK_COLOR_ID = 1;
const BATCH_SIZE = 10_000;

const HELP_TEXT = `Usage: pnpm db:repair-canvas [options]

Options:
  -c, --canvas-id <id>   Only repair the canvas with the given id
  -f, --force            Skip the count-based fast path and always run the
                         full per-pixel comparison (useful when out-of-bounds
                         pixels could mask missing in-bounds positions)
  -h, --help             Show this help message`;

let parsedArgs;
try {
  parsedArgs = parseArgs({
    args: process.argv.slice(2).filter((arg) => arg !== "--"),
    options: {
      "canvas-id": { type: "string", short: "c" },
      force: { type: "boolean", short: "f", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
    strict: true,
    allowPositionals: false,
  });
} catch (error) {
  console.error(error.message);
  console.error(`\n${HELP_TEXT}`);
  process.exit(1);
}

const { values: args } = parsedArgs;

if (args.help) {
  console.log(HELP_TEXT);
  process.exit(0);
}

let canvasIdFilter = null;
if (args["canvas-id"] !== undefined) {
  const parsed = Number.parseInt(args["canvas-id"], 10);
  if (!Number.isInteger(parsed) || String(parsed) !== args["canvas-id"].trim()) {
    throw new Error(
      `Invalid --canvas-id value: "${args["canvas-id"]}" (expected an integer)`,
    );
  }
  canvasIdFilter = parsed;
}

const force = args.force;

const prisma = new PrismaClient({ adapter: new PrismaPg(databaseUrl) });

async function repairCanvas(canvas) {
  const expected = canvas.width * canvas.height;

  const existing = await prisma.pixel.findMany({
    select: { x: true, y: true },
    where: { canvas_id: canvas.id },
  });

  if (!force && existing.length === expected) {
    console.log(`Canvas ${canvas.id} (${canvas.name}): OK (${expected} pixels)`);
    return 0;
  }

  const occupied = new Set(existing.map((p) => `${p.x}:${p.y}`));
  const missing = [];

  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      if (!occupied.has(`${x}:${y}`)) {
        missing.push({ canvas_id: canvas.id, x, y, color_id: BLANK_COLOR_ID });
      }
    }
  }

  if (missing.length === 0) {
    const outOfBounds = existing.length - expected;
    const suffix =
      outOfBounds > 0 ? `, ${outOfBounds} out-of-bounds left untouched` : "";
    console.log(
      `Canvas ${canvas.id} (${canvas.name}): OK (${expected} in-bounds pixels${suffix})`,
    );
    return 0;
  }

  console.log(
    `Canvas ${canvas.id} (${canvas.name}): ${existing.length}/${expected} pixels — inserting ${missing.length} missing entries`,
  );

  for (let i = 0; i < missing.length; i += BATCH_SIZE) {
    const batch = missing.slice(i, i + BATCH_SIZE);
    await prisma.pixel.createMany({ data: batch });
    console.log(`  inserted ${i + batch.length}/${missing.length}`);
  }

  return missing.length;
}

async function main() {
  const canvases = await prisma.canvas.findMany({
    select: { id: true, name: true, width: true, height: true },
    where: canvasIdFilter === null ? undefined : { id: canvasIdFilter },
    orderBy: { id: "asc" },
  });

  if (canvases.length === 0) {
    if (canvasIdFilter === null) {
      console.log("No canvases found.");
      return;
    }
    throw new Error(`Canvas with id ${canvasIdFilter} not found.`);
  }

  const scope =
    canvasIdFilter === null
      ? `${canvases.length} canvas(es)`
      : `canvas ${canvasIdFilter}`;
  console.log(`Repairing ${scope}${force ? " (force mode)" : ""}\n`);

  let totalRepaired = 0;
  for (const canvas of canvases) {
    totalRepaired += await repairCanvas(canvas);
  }

  console.log(`\nDone. Inserted ${totalRepaired} missing pixel(s) total.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
