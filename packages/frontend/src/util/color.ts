import type { PixelColor } from "@blurple-canvas-web/types";

const CHANNEL_MAX = 0xff;

/** @see https://en.wikipedia.org/wiki/Rec._709#Luma_coefficients */
const LUMA_COEFFICIENTS = { r: 0.2126, g: 0.7152, b: 0.0722 } as const;

/**
 * WCAG luminance where contrast against black equals contrast against white.
 * @see https://www.w3.org/WAI/GL/wiki/Contrast_ratio
 */
const BLACK_WHITE_CROSSOVER_LUMINANCE = Math.sqrt(0.05 * 1.05) - 0.05;

/** `PixelColor` in, CSS `<color>` out */
export function rgbaToCssColor([
  r,
  g,
  b,
  a,
]: PixelColor): `rgb(${string} ${string} ${string} / ${string})` {
  return `rgb(${r} ${g} ${b} / ${a / CHANNEL_MAX})`;
}

/** @see https://en.wikipedia.org/wiki/SRGB#Transformation */
function srgbChannelToLinear(channel: number): number {
  const normalized = channel / CHANNEL_MAX;
  return normalized <= 0.03928 ?
      normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

/** @see https://www.w3.org/WAI/GL/wiki/Relative_luminance */
function relativeLuminance([r, g, b]: PixelColor): number {
  return (
    LUMA_COEFFICIENTS.r * srgbChannelToLinear(r) +
    LUMA_COEFFICIENTS.g * srgbChannelToLinear(g) +
    LUMA_COEFFICIENTS.b * srgbChannelToLinear(b)
  );
}

/** Pick `--discord-black` or `--discord-white` for max contrast against `rgba`. */
export function monochromeContrastColor(rgba: PixelColor): string {
  return relativeLuminance(rgba) > BLACK_WHITE_CROSSOVER_LUMINANCE ?
      "var(--discord-black)"
    : "var(--discord-white)";
}
