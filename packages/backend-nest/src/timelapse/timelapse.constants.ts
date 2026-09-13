import type { PaletteColor } from "@blurple-canvas-web/types";

import type { TimelapseType, VideoFormat } from "./timelapse.types";

export const END_CARD_TRANSITION_DURATION_MS = 1_000;
export const END_CARD_DISPLAY_DURATION_MS = 5_000;

export const END_CARD_BACKGROUND_COLOR = {
  r: 88,
  g: 101,
  b: 242,
  alpha: 1,
} as const;

export const NOT_QUITE_BLACK_RGBA: PaletteColor["rgba"] = [35, 39, 42, 255];

export const VIDEO_FORMAT_MAP: Record<TimelapseType, VideoFormat> = {
  default: "mp4",
  raw: "webm",
} as const;

export function getTimelapseVideoFormat(type: TimelapseType): VideoFormat {
  return VIDEO_FORMAT_MAP[type];
}
