import { unlink } from "node:fs/promises";
import path from "node:path";
import type { PaletteColor } from "@blurple-canvas-web/types";

import { Injectable } from "@nestjs/common";
import { FfmpegService } from "./ffmpeg.service";
import { getTimelapseVideoFormat } from "./timelapse.constants";
import type { Bounds, TimelapseType, VideoFormat } from "./timelapse.types";

interface VideoDimensionsInput {
  canvasWidth: number;
  canvasHeight: number;
  cropBounds: Bounds | undefined;
  scale: number;
}

export function getTimelapseVideoDimensions({
  canvasWidth,
  canvasHeight,
  cropBounds,
  scale,
}: VideoDimensionsInput): { width: number; height: number } {
  const width = cropBounds ? cropBounds.x1 - cropBounds.x0 + 1 : canvasWidth;
  const height = cropBounds ? cropBounds.y1 - cropBounds.y0 + 1 : canvasHeight;

  // Truncate to even numbers for H.264 compatibility.
  return {
    width: Math.trunc((width * scale) / 2) * 2,
    height: Math.trunc((height * scale) / 2) * 2,
  };
}

export function buildFfmpegBackgroundColor(
  backgroundColor: PaletteColor["rgba"],
): string {
  const [r, g, b, a] = backgroundColor;
  const alpha = Math.max(0, Math.min(1, a / 255));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}@${alpha}`;
}

export function buildFilterGraph(
  cropBounds: Bounds | undefined,
  scale: number,
): string {
  const base =
    "[1:v][0:v]scale2ref[bg][fg];[bg][fg]overlay=shortest=1:format=auto";

  // Inclusive bounds: width = x1 - x0 + 1
  const crop =
    cropBounds ?
      `,crop=${cropBounds.x1 - cropBounds.x0 + 1}:${cropBounds.y1 - cropBounds.y0 + 1}:${cropBounds.x0}:${cropBounds.y0}`
    : "";

  const scaleFilter = `,scale=trunc(iw*${scale}/2)*2:trunc(ih*${scale}/2)*2:flags=neighbor`;
  return `${base}${crop}${scaleFilter}`;
}

export function buildMainVideoEncodeArgs({
  frameRate,
  ffmpegBackgroundColor,
  filterGraph,
  outputPath,
  outputFormat,
}: {
  frameRate: number;
  ffmpegBackgroundColor: string;
  filterGraph: string;
  outputPath: string;
  outputFormat: VideoFormat;
}): string[] {
  return [
    "-hide_banner",
    "-loglevel",
    "error",
    "-f",
    "image2pipe",
    "-framerate",
    String(frameRate),
    "-i",
    "pipe:0",
    "-f",
    "lavfi",
    "-i",
    `color=c=${ffmpegBackgroundColor}:s=16x16:r=${frameRate}`,
    "-filter_complex",
    filterGraph,
    "-an",
    "-c:v",
    outputFormat === "webm" ? "libvpx-vp9" : "libx264",
    ...(outputFormat === "webm" ?
      ["-lossless", "1", "-pix_fmt", "yuv444p"]
    : ["-pix_fmt", "yuv420p", "-movflags", "frag_keyframe+empty_moov"]),
    "-f",
    outputFormat,
    outputPath,
  ];
}

@Injectable()
export class TimelapseEncoderService {
  constructor(private readonly ffmpeg: FfmpegService) {}

  async encodeMainVideo({
    imagePaths,
    frameRate,
    backgroundColor,
    cropBounds,
    scale,
    raw,
  }: {
    imagePaths: string[];
    frameRate: number;
    backgroundColor: PaletteColor["rgba"];
    cropBounds?: Bounds;
    scale: number;
    raw: TimelapseType;
  }): Promise<string> {
    const outputFormat = getTimelapseVideoFormat(raw);
    const tempDir = await this.ffmpeg.getTempDir();
    const outputPath = path.join(
      tempDir,
      `main-${process.pid}-${Date.now()}.${outputFormat}`,
    );

    const ffmpegBackgroundColor = buildFfmpegBackgroundColor(backgroundColor);
    const filterGraph = buildFilterGraph(cropBounds, scale);

    try {
      await this.ffmpeg.run({
        args: buildMainVideoEncodeArgs({
          frameRate,
          ffmpegBackgroundColor,
          filterGraph,
          outputPath,
          outputFormat,
        }),
        stdinImagePaths: imagePaths,
      });

      return outputPath;
    } catch (error) {
      await unlink(outputPath).catch(() => undefined);
      throw error;
    }
  }
}
