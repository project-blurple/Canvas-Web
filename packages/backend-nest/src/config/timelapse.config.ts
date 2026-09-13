import type { ConfigType } from "@nestjs/config";
import { registerAs } from "@nestjs/config";

import {
  TIMELAPSE_END_CARD_IMAGE_PATH,
  TIMELAPSE_VIDEO_ROOT,
} from "@/timelapse/timelapse-paths";
import { ConfigNamespace } from "./config-namespace";
import { validateEnv } from "./env";

export const timelapseConfig = registerAs(ConfigNamespace.Timelapse, () => {
  const env = validateEnv(process.env);

  return {
    videoRoot: TIMELAPSE_VIDEO_ROOT,
    endCardImagePath: TIMELAPSE_END_CARD_IMAGE_PATH,
    ffmpegPath: env.FFMPEG_PATH,
    defaultFrameRate: 30,
    defaultEndHoldDurationMs: 2_000,
    invalidationTtlMs: 2 * 60 * 60 * 1_000,
    maxConcurrentEncodes: env.TIMELAPSE_MAX_CONCURRENT_ENCODES,
    encodeTimeoutMs: env.TIMELAPSE_ENCODE_TIMEOUT_MS,
  };
});

export type TimelapseConfig = ConfigType<typeof timelapseConfig>;
