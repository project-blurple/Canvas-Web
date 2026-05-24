import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
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

const prisma = new PrismaClient({ adapter: new PrismaPg(databaseUrl) });

async function repairCanvas(canvas) {
  const expected = canvas.width * canvas.height;

  const existing = await prisma.pixel.findMany({
    select: { x: true, y: true },
    where: { canvas_id: canvas.id },
  });

  if (existing.length === expected) {
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
    orderBy: { id: "asc" },
  });

  console.log(`Found ${canvases.length} canvas(es)\n`);

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
