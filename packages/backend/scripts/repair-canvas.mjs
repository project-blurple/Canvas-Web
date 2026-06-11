import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { PrismaPg } from "@prisma/adapter-pg";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { Prisma, PrismaClient } = require(
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
  -f, --force            Overwrite every in-bounds pixel using the latest
                         available history entry as the source of truth.
                         Cells without history are reset to blank.
                         Out-of-bounds pixels are deleted.
  -h, --help             Show this help message`;

/**
 * @param {string[]} argv
 */
function parseOptions(argv) {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv.filter((arg) => arg !== "--"),
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

  if (parsed.values.help) {
    console.log(HELP_TEXT);
    process.exit(0);
  }

  const rawId = parsed.values["canvas-id"];
  let canvasIdFilter = null;
  if (rawId !== undefined) {
    const parsedId = Number.parseInt(rawId, 10);
    if (!Number.isInteger(parsedId) || String(parsedId) !== rawId.trim()) {
      throw new Error(
        `Invalid --canvas-id value: "${rawId}" (expected an integer)`,
      );
    }
    canvasIdFilter = parsedId;
  }

  return { canvasIdFilter, force: parsed.values.force };
}

const label = (canvas) => `Canvas ${canvas.id} (${canvas.name})`;

/**
 * @type {import("../src/client/core/generated/client").PrismaClient}
 */
const prisma = new PrismaClient({ adapter: new PrismaPg(databaseUrl) });

/**
 * Returns a Map<"x:y", color_id> with the most recent non-erased history color
 * for every in-bounds coordinate that has any history. Coordinates without
 * history are absent from the map and should be treated as blank.
 * @param {import("../src/client/core/generated/client").canvas} canvas
 */
async function latestHistoryByCoord(canvas) {
  const rows = await prisma.$queryRaw`
    SELECT DISTINCT ON (x, y) x, y, color_id
    FROM history
    WHERE canvas_id = ${canvas.id}
      AND erased_at IS NULL
      AND x >= 0 AND x < ${canvas.width}
      AND y >= 0 AND y < ${canvas.height}
    ORDER BY x, y, timestamp DESC, id DESC
  `;
  return new Map(rows.map((row) => [`${row.x}:${row.y}`, row.color_id]));
}

/**
 * @param {import("../src/client/core/generated/client").canvas} canvas
 */
async function deleteOutOfBoundsPixels(canvas) {
  const { count } = await prisma.pixel.deleteMany({
    where: {
      canvas_id: canvas.id,
      OR: [
        { x: { lt: 0 } },
        { x: { gte: canvas.width } },
        { y: { lt: 0 } },
        { y: { gte: canvas.height } },
      ],
    },
  });
  return count;
}

/**
 * @param {number} canvasId
 * @param {import("../src/client/core/generated/client").pixel[]} pixels
 */
async function upsertPixelsInBatches(canvasId, pixels) {
  for (let i = 0; i < pixels.length; i += BATCH_SIZE) {
    const batch = pixels.slice(i, i + BATCH_SIZE);
    const tuples = batch.map(
      (p) => Prisma.sql`(${p.x}::int, ${p.y}::int, ${p.color_id}::int)`,
    );
    await prisma.$executeRaw`
      INSERT INTO pixel (canvas_id, x, y, color_id)
      SELECT ${canvasId}::int, u.x, u.y, u.color_id
      FROM (VALUES ${Prisma.join(tuples)}) AS u(x, y, color_id)
      ON CONFLICT (canvas_id, x, y) DO UPDATE
      SET color_id = EXCLUDED.color_id
    `;
    console.log(`  wrote ${i + batch.length}/${pixels.length}`);
  }
}

/**
 * @param {import("../src/client/core/generated/client").canvas} canvas
 */
async function fillMissingBlanks(canvas) {
  const expected = canvas.width * canvas.height;
  const existing = await prisma.pixel.findMany({
    select: { x: true, y: true },
    where: { canvas_id: canvas.id },
  });

  if (existing.length === expected) {
    console.log(`${label(canvas)}: OK (${expected} pixels)`);
    return { inserted: 0 };
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
    console.log(`${label(canvas)}: OK (${expected} in-bounds pixels${suffix})`);
    return { inserted: 0 };
  }

  console.log(
    `${label(canvas)}: ${existing.length}/${expected} pixels — inserting ${missing.length} missing entries`,
  );

  for (let i = 0; i < missing.length; i += BATCH_SIZE) {
    const batch = missing.slice(i, i + BATCH_SIZE);
    await prisma.pixel.createMany({ data: batch });
    console.log(`  inserted ${i + batch.length}/${missing.length}`);
  }

  return { inserted: missing.length };
}

/**
 * @param {import("../src/client/core/generated/client").canvas} canvas
 */
async function reconcileAgainstHistory(canvas) {
  const [historyByCoord, deleted] = await Promise.all([
    latestHistoryByCoord(canvas),
    deleteOutOfBoundsPixels(canvas),
  ]);

  const pixels = [];
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const color_id = historyByCoord.get(`${x}:${y}`) ?? BLANK_COLOR_ID;
      pixels.push({ x, y, color_id });
    }
  }

  const suffix = deleted > 0 ? `, deleted ${deleted} out-of-bounds` : "";
  console.log(
    `${label(canvas)}: force-writing ${pixels.length} in-bounds pixel(s)${suffix}`,
  );

  await upsertPixelsInBatches(canvas.id, pixels);

  return { written: pixels.length, deleted };
}

/**
 * @param {{ canvasIdFilter: number | null, force: boolean }} options
 */
async function main({ canvasIdFilter, force }) {
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
    canvasIdFilter === null ?
      `${canvases.length} canvas(es)`
    : `canvas ${canvasIdFilter}`;
  console.log(`Repairing ${scope}${force ? " (force mode)" : ""}\n`);

  if (force) {
    let written = 0;
    let deleted = 0;
    for (const canvas of canvases) {
      const result = await reconcileAgainstHistory(canvas);
      written += result.written;
      deleted += result.deleted;
    }
    const suffix = deleted > 0 ? `, deleted ${deleted} out-of-bounds` : "";
    console.log(`\nDone. Force-wrote ${written} pixel(s)${suffix} total.`);
    return;
  }

  let inserted = 0;
  for (const canvas of canvases) {
    const result = await fillMissingBlanks(canvas);
    inserted += result.inserted;
  }
  console.log(`\nDone. Inserted ${inserted} missing pixel(s) total.`);
}

try {
  await main(parseOptions(process.argv.slice(2)));
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
