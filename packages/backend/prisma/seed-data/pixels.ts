import { createReadStream } from "node:fs";
import { canvasSeedData } from "./events.ts";

const pixelSeedDataPath = new URL("./pixelData2024.csv", import.meta.url);
const historySeedDataPath = new URL("./historyData2024.csv", import.meta.url);
const SEED_BATCH_SIZE = 2000;

function normalizeCsvHeader(line: string): string {
  return line
    .replace(/^\uFEFF/, "")
    .replaceAll('"', "")
    .trim();
}

async function* readLines(path: URL): AsyncGenerator<string> {
  const fileStream = createReadStream(path, { encoding: "utf8" });
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

interface PixelSeedData {
  canvas_id: number;
  x: number;
  y: number;
  color_id: number;
}

function parsePixelSeedData(line: string): PixelSeedData {
  const [x, y, colorId] = line.split(",");

  return {
    canvas_id: 2024,
    x: Number(x),
    y: Number(y),
    color_id: Number(colorId),
  };
}

async function* pixelSeedData2024Batches(): AsyncGenerator<PixelSeedData[]> {
  const batch: PixelSeedData[] = [];
  let isHeader = true;

  for await (const line of readLines(pixelSeedDataPath)) {
    if (isHeader) {
      if (normalizeCsvHeader(line) !== "x,y,color_id") {
        throw new Error(
          `Unexpected CSV header in ${pixelSeedDataPath.pathname}`,
        );
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
    throw new Error(`Unexpected empty CSV in ${pixelSeedDataPath.pathname}`);
  }

  if (batch.length > 0) {
    yield batch;
  }
}

function* generatedPixelSeedDataBatches(): Generator<PixelSeedData[]> {
  const canvases = canvasSeedData.filter((canvas) => canvas.id !== 2024);
  const batch: PixelSeedData[] = [];

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

export async function* pixelSeedDataBatches(): AsyncGenerator<PixelSeedData[]> {
  yield* pixelSeedData2024Batches();
  yield* generatedPixelSeedDataBatches();
}

interface HistorySeedData {
  user_id: bigint;
  canvas_id: number;
  x: number;
  y: number;
  color_id: number;
  timestamp: Date;
}

function parseHistorySeedData(line: string): HistorySeedData {
  const [userId, x, y, colorId, timestamp] = line.split(",");

  return {
    user_id: BigInt(userId),
    canvas_id: 2024,
    x: Number(x),
    y: Number(y),
    color_id: Number(colorId),
    timestamp: new Date(timestamp),
  };
}

async function* historySeedData2024Batches(): AsyncGenerator<
  HistorySeedData[]
> {
  const batch: HistorySeedData[] = [];
  let isHeader = true;

  for await (const line of readLines(historySeedDataPath)) {
    if (isHeader) {
      if (normalizeCsvHeader(line) !== "user_id,x,y,color_id,timestamp") {
        throw new Error(
          `Unexpected CSV header in ${historySeedDataPath.pathname}`,
        );
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
    throw new Error(`Unexpected empty CSV in ${historySeedDataPath.pathname}`);
  }

  if (batch.length > 0) {
    yield batch;
  }
}

export async function* historySeedDataBatches(): AsyncGenerator<
  HistorySeedData[]
> {
  yield* historySeedData2024Batches();
}
