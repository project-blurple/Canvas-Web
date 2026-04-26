import type { PaletteColor } from "@blurple-canvas-web/types";
import { SwatchBase } from "./SwatchBase";

export interface StaticSwatchProps {
  rgba: PaletteColor["rgba"];
}

export function StaticSwatch({ rgba, ...props }: StaticSwatchProps) {
  // Convert [255, 255, 255, 255] to rgb(255 255 255 / 1.0)
  const rgb = rgba.slice(0, 3).join(" ");
  const alphaFloat = rgba[3] / 255;

  return <SwatchBase colorString={`rgb(${rgb} / ${alphaFloat})`} {...props} />;
}
