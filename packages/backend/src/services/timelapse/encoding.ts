import { readFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import type { PaletteColor } from "@blurple-canvas-web/types";
import ffmpegStatic from "ffmpeg-static";
import type { Bounds } from "@/utils";
import {
  getAppTempDir,
  runFfmpegProcess,
  streamImagePathsToFfmpegStdin,
} from "./ffmpeg";
import type { CanvasExportScale, TimelapseType } from "./types";
import { getTimelapseVideoFormat } from "./types";

export function getTimelapseVideoDimensions({
  canvasWidth,
  canvasHeight,
  cropBounds,
  scale,
}: {
  canvasWidth: number;
  canvasHeight: number;
  cropBounds: Bounds | undefined;
  scale: CanvasExportScale;
}): { width: number; height: number } {
  const sourceWidth =
    cropBounds ? cropBounds.x1 - cropBounds.x0 + 1 : canvasWidth;
  const sourceHeight =
    cropBounds ? cropBounds.y1 - cropBounds.y0 + 1 : canvasHeight;

  return {
    width: Math.trunc((sourceWidth * scale) / 2) * 2,
    height: Math.trunc((sourceHeight * scale) / 2) * 2,
  };
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
  outputFormat: ReturnType<typeof getTimelapseVideoFormat>;
}): string[] {
  return [
    // general flags: suppress banner, only show errors
    "-hide_banner",
    "-loglevel",
    "error",

    // INPUT (pipe): image2pipe reads raw image files streamed into stdin
    "-f",
    "image2pipe",
    "-framerate",
    String(frameRate),
    "-i",
    "pipe:0",

    // INPUT (lavfi): a small solid-color background input used with scale2ref
    "-f",
    "lavfi",
    "-i",
    `color=c=${ffmpegBackgroundColor}:s=16x16:r=${frameRate}`,

    // FILTER: composite the streamed images over the generated background,
    // apply optional crop and scale (the `filterGraph` variable contains this)
    "-filter_complex",
    filterGraph,

    // output options
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

/**
 * Encode the main frames-only video from images (no appended end-card/tail).
 */
export async function encodeMainVideoFromImages({
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
  scale: CanvasExportScale;
  raw: TimelapseType;
}): Promise<Buffer> {
  const ffmpegPath = ffmpegStatic;

  if (!ffmpegPath) {
    throw new Error("ffmpeg-static did not provide a binary path");
  }

  const [r, g, b, a] = backgroundColor;
  const backgroundAlpha = Math.max(0, Math.min(1, a / 255));
  const ffmpegBackgroundColor = `#${r.toString(16).padStart(2, "0")}${g
    .toString(16)
    .padStart(2, "0")}${b.toString(16).padStart(2, "0")}@${backgroundAlpha}`;
  const baseFilterGraph =
    "[1:v][0:v]scale2ref[bg][fg];[bg][fg]overlay=shortest=1:format=auto";
  const cropFilter =
    cropBounds ?
      `,crop=${cropBounds.x1 - cropBounds.x0}:${cropBounds.y1 - cropBounds.y0}:${cropBounds.x0}:${cropBounds.y0}`
    : "";
  const scaleFilter = `,scale=trunc(iw*${scale}/2)*2:trunc(ih*${scale}/2)*2:flags=neighbor`;
  const filterGraph = `${baseFilterGraph}${cropFilter}${scaleFilter}`;

  const tempOutputPath = join(
    await getAppTempDir(),
    `${process.pid}-${Date.now()}.${getTimelapseVideoFormat(raw)}`,
  );

  try {
    await runFfmpegProcess({
      ffmpegPath,
      args: buildMainVideoEncodeArgs({
        frameRate,
        ffmpegBackgroundColor,
        filterGraph,
        outputPath: tempOutputPath,
        outputFormat: getTimelapseVideoFormat(raw),
      }),
      captureStdout: false,
      onProcess: async (proc) => {
        const stdin = proc.stdin;
        if (!stdin) {
          throw new Error("ffmpeg did not expose stdin");
        }

        await streamImagePathsToFfmpegStdin({ stdin, imagePaths });
      },
    });

    const mainVideoBuffer = await readFile(tempOutputPath);
    if (!mainVideoBuffer.length) {
      throw new Error("ffmpeg produced empty output");
    }

    return mainVideoBuffer;
  } finally {
    await unlink(tempOutputPath).catch(() => undefined);
  }
}
