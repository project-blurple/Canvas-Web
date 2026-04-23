import { createReadStream } from "node:fs";
import path from "node:path";
import type { Prisma } from "../../client/generated/client";
// @ts-expect-error Node strip-types runtime needs explicit .ts extension.
import { canvasSeedData } from "./events.ts";

const rootDataPath = path.join(process.cwd(), "src", "seed", "data");

const pixelSeedDataPath = path.join(rootDataPath, "pixelData2024.csv");

const historySeedDataPath = path.join(rootDataPath, "historyData2024.csv");

const SEED_BATCH_SIZE = 2000;

function normalizeCsvHeader(line: string): string {
  return line
    .replace(/^\uFEFF/, "")
    .replaceAll('"', "")
    .trim();
}

async function* readLines(filePath: string): AsyncGenerator<string> {
  const fileStream = createReadStream(filePath, { encoding: "utf8" });
  let buffer = "";

  for await (const chunk of fileStream) {
    buffer += chunk;

    let lineBreakIndex = buffer.indexOf("\n");
    while (lineBreakIndex !== -1) {
      const line = buffer.slice(0, lineBreakIndex).replace(/\r$/, "");
      yield line;
      buffer = buffer.slice(lineBreakIndex + 1);
      lineBreakIndex = buffer.indexOf("\n");
    }
  }

  if (buffer.length > 0) {
    yield buffer.replace(/\r$/, "");
  }
}

function parsePixelSeedData(line: string): Prisma.pixelCreateManyInput {
  const [x, y, colorId] = line.split(",");

  return {
    canvas_id: 2024,
    x: Number(x),
    y: Number(y),
    color_id: Number(colorId),
  };
}

async function* pixelSeedData2024Batches(): AsyncGenerator<
  Prisma.pixelCreateManyInput[]
> {
  const batch: Prisma.pixelCreateManyInput[] = [];
  let isHeader = true;

  for await (const line of readLines(pixelSeedDataPath)) {
    if (isHeader) {
      if (normalizeCsvHeader(line) !== "x,y,color_id") {
        throw new Error(`Unexpected CSV header in ${pixelSeedDataPath}`);
      }

      isHeader = false;
      continue;
    }

    if (line.length === 0) continue;

    batch.push(parsePixelSeedData(line));

    if (batch.length >= SEED_BATCH_SIZE) {
      yield batch;
      batch.length = 0;
    }
  }

  if (isHeader) {
    throw new Error(`Unexpected empty CSV in ${pixelSeedDataPath}`);
  }

  if (batch.length > 0) {
    yield batch;
  }
}

function* generatedPixelSeedDataBatches(): Generator<
  Prisma.pixelCreateManyInput[]
> {
  const canvases = canvasSeedData.filter((canvas) => canvas.id !== 2024);
  const batch: Prisma.pixelCreateManyInput[] = [];

  for (const canvas of canvases) {
    for (let x = 0; x < canvas.width; x++) {
      for (let y = 0; y < canvas.height; y++) {
        batch.push({
          canvas_id: canvas.id,
          x,
          y,
          color_id: 1,
        });

        if (batch.length >= SEED_BATCH_SIZE) {
          yield batch;
          batch.length = 0;
        }
      }
    }
  }

  if (batch.length > 0) {
    yield batch;
  }
}

export async function* pixelSeedDataBatches(): AsyncGenerator<
  Prisma.pixelCreateManyInput[]
> {
  yield* pixelSeedData2024Batches();
  yield* generatedPixelSeedDataBatches();
}

function parseHistorySeedData(line: string): Prisma.historyCreateManyInput {
  const [userId, x, y, colorId, timestamp] = line.split(",");

  return {
    user_id: BigInt(userId),
    canvas_id: 2024,
    x: Number.parseInt(x, 10),
    y: Number.parseInt(y, 10),
    color_id: Number.parseInt(colorId, 10),
    timestamp: new Date(timestamp),
    guild_id: 412754940885467146n,
  };
}

async function* historySeedData2024Batches(): AsyncGenerator<
  Prisma.historyCreateManyInput[]
> {
  const batch: Prisma.historyCreateManyInput[] = [];
  let isHeader = true;

  for await (const line of readLines(historySeedDataPath)) {
    if (isHeader) {
      if (normalizeCsvHeader(line) !== "user_id,x,y,color_id,timestamp") {
        throw new Error(`Unexpected CSV header in ${historySeedDataPath}`);
      }

      isHeader = false;
      continue;
    }

    if (line.length === 0) continue;

    batch.push(parseHistorySeedData(line));

    if (batch.length >= SEED_BATCH_SIZE) {
      yield batch;
      batch.length = 0;
    }
  }

  if (isHeader) {
    throw new Error(`Unexpected empty CSV in ${historySeedDataPath}`);
  }

  if (batch.length > 0) {
    yield batch;
  }
}

export async function* historySeedDataBatches(): AsyncGenerator<
  Prisma.historyCreateManyInput[]
> {
  yield* historySeedData2024Batches();
}
