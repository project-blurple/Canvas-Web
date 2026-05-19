import type { PixelColor } from "@blurple-canvas-web/types";

const CHANNEL_MAX = 0xff;

/** `PixelColor` in, CSS `<color>` out */
export function rgbaToCssColor([
  r,
  g,
  b,
  a,
]: PixelColor): `rgb(${string} ${string} ${string} / ${string})` {
  return `rgb(${r} ${g} ${b} / ${a / CHANNEL_MAX})`;
}
