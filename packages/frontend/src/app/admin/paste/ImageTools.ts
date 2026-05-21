import type { Palette, PixelColor } from "@blurple-canvas-web/types";

export type UploadedImage = {
  file: File;
  src: string;
  width: number;
  height: number;
  data: ImageRawDataEntry[];
};

export function getImageDimensions(src: string) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      resolve({
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
    };

    image.onerror = () => reject(new Error("Unable to load image"));
    image.src = src;
  });
}

function readFileAsDataURL(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve(reader.result as string);
    };

    reader.onerror = () => reject(new Error("Unable to read file"));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to load image"));
    image.src = src;
  });
}

export interface ImageRawDataEntry {
  x: number;
  y: number;
  color: PixelColor;
}

export interface MappedImageDataEntry {
  x: number;
  y: number;
  colorIndex: number;
}

export async function imageFileToData(file: File) {
  const src = await readFileAsDataURL(file);
  const image = await loadImage(src);

  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Unable to get canvas context");
  }

  ctx.drawImage(image, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const dataEntries: ImageRawDataEntry[] = [];

  for (let i = 0; i < imageData.data.length; i += 4) {
    const alpha = imageData.data[i + 3];
    if (alpha === 0) continue; // Skip fully transparent pixels

    const color = [
      imageData.data[i], // Red
      imageData.data[i + 1], // Green
      imageData.data[i + 2], // Blue
      alpha, // Alpha
    ] as PixelColor;

    dataEntries.push({
      x: (i / 4) % canvas.width,
      y: Math.floor(i / 4 / canvas.width),
      color,
    });
  }

  return dataEntries;
}

export function mapImageDataToPaletteIndices(
  imageData: ImageRawDataEntry[],
  palette: Palette,
) {
  const colorToIndexMap = new Map(
    palette.map((color, index) => [color.rgba, index] as const),
  );

  return imageData.map((entry) => {
    const colorIndex = colorToIndexMap.get(entry.color);
    if (colorIndex === undefined) {
      throw new Error();
    }
    return {
      x: entry.x,
      y: entry.y,
      colorIndex,
    } as MappedImageDataEntry;
  });
}
