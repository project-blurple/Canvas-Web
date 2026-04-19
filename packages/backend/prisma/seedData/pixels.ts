// @ts-expect-error
import { readFileSync } from "node:fs";
import { canvasSeedData } from "./events";

const pixelSeedDataPath = new URL("./pixelData2024.csv", import.meta.url);

interface PixelSeedData {
  canvas_id: number;
  x: number;
  y: number;
  color_id: number;
}

function pixelSeedData2024(): PixelSeedData[] {
  const csv: string = readFileSync(pixelSeedDataPath, "utf8").trim();
  const lines: string[] = csv.split(/\r?\n/);
  const header = lines[0] ?? "";
  const rows = lines.slice(1);

  if (header !== '"x","y","color_id"') {
    throw new Error(`Unexpected CSV header in ${pixelSeedDataPath.pathname}`);
  }

  return rows
    .filter((line: string) => line.length > 0)
    .map((line: string) => {
      const [x, y, colorId] = line.split(",");

      return {
        canvas_id: 2024,
        x: Number(x),
        y: Number(y),
        color_id: Number(colorId),
      };
    });
}

export function pixelSeedData(): PixelSeedData[] {
  const seedData = pixelSeedData2024();

  const canvases = canvasSeedData.filter((canvas) => canvas.id !== 2024);

  for (const canvas of canvases) {
    for (let x = 0; x < canvas.width; x++) {
      for (let y = 0; y < canvas.height; y++) {
        seedData.push({
          canvas_id: canvas.id,
          x,
          y,
          color_id: 1, // Blank pixel
        });
      }
    }
  }

  return seedData;
}
