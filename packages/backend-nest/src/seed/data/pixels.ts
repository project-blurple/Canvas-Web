import { createReadStream } from "node:fs";
import path from "node:path";
import type { Prisma } from "../../common/database/core/prisma.client";
import { canvasSeedData } from "./events";

const pixelSeedDataPath = path.join(__dirname, "pixelData2024.csv");

const historySeedDataPath = path.join(__dirname, "historyData2024.csv");

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

function parsePixelSeedData(line: string): Prisma.PixelCreateManyInput {
  const [x, y, colorId] = line.split(",");

  return {
    canvasId: 2024,
    x: Number(x),
    y: Number(y),
    colorId: Number(colorId),
  };
}

async function* pixelSeedData2024Batches(): AsyncGenerator<
  Prisma.PixelCreateManyInput[]
> {
  const batch: Prisma.PixelCreateManyInput[] = [];
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
  Prisma.PixelCreateManyInput[]
> {
  const canvases = canvasSeedData.filter((canvas) => canvas.id !== 2024);
  const batch: Prisma.PixelCreateManyInput[] = [];

  for (const canvas of canvases) {
    for (let x = 0; x < canvas.width; x++) {
      for (let y = 0; y < canvas.height; y++) {
        batch.push({
          canvasId: canvas.id,
          x,
          y,
          colorId: 1,
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
  Prisma.PixelCreateManyInput[]
> {
  yield* pixelSeedData2024Batches();
  yield* generatedPixelSeedDataBatches();
}

function parseHistorySeedData(line: string): Prisma.HistoryCreateManyInput {
  const [userId, x, y, colorId, timestamp] = line.split(",");

  return {
    userId: BigInt(userId),
    canvasId: 2024,
    x: Number.parseInt(x, 10),
    y: Number.parseInt(y, 10),
    colorId: Number.parseInt(colorId, 10),
    timestamp: new Date(timestamp),
    guildId: 412754940885467146n,
  };
}

async function* historySeedData2024Batches(): AsyncGenerator<
  Prisma.HistoryCreateManyInput[]
> {
  const batch: Prisma.HistoryCreateManyInput[] = [];
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
  Prisma.HistoryCreateManyInput[]
> {
  yield* historySeedData2024Batches();
}
