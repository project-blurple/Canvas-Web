import type { PixelColor } from "@blurple-canvas-web/types";
import sharp from "sharp";

/**
 * Decodes a (WebP) snapshot image into a flat RGBA byte buffer, mirroring how
 * the generator reads previous snapshots back in.
 */
export async function decodeRawPixels(image: Buffer): Promise<Buffer> {
  const { data } = await sharp(image)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return data;
}

/** Returns the `[r, g, b, a]` channels of the pixel at `(x, y)`. */
export function pixelAt(
  data: Buffer,
  width: number,
  x: number,
  y: number,
): number[] {
  const index = (y * width + x) * 4;
  return [data[index], data[index + 1], data[index + 2], data[index + 3]];
}

/** Writes a lossless WebP filled with a single colour, for use as a fixture. */
export async function writeSolidWebp(
  filePath: string,
  width: number,
  height: number,
  rgba: PixelColor,
): Promise<void> {
  const buffer = Buffer.alloc(width * height * 4);
  for (let index = 0; index < buffer.length; index += 4) {
    buffer[index] = rgba[0];
    buffer[index + 1] = rgba[1];
    buffer[index + 2] = rgba[2];
    buffer[index + 3] = rgba[3];
  }

  await sharp(buffer, { raw: { width, height, channels: 4 } })
    .webp({ lossless: true })
    .toFile(filePath);
}
