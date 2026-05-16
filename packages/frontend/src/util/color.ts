import { PixelColor } from "@blurple-canvas-web/types";

/** `PixelColor` in, CSS `<color>` out */
export function rgbaToCssColor([
  r,
  g,
  b,
  a,
]: PixelColor): `rgb(${string} ${string} ${string} / ${string})` {
  const alphaFloat = a / 0xff;
  return `rgb(${r} ${g} ${b} / ${alphaFloat})`;
}
