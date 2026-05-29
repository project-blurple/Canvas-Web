import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdir,
  readFile,
  rename,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type {
  CanvasExportScale,
  CanvasInfo,
  PaletteColor,
} from "@blurple-canvas-web/types";
import ffmpegStatic from "ffmpeg-static";
import sharp from "sharp";
import { snapshotPrisma } from "@/client/snapshots";
import {
  getTimelapseCanvasDirectory,
  getTimelapseVideoPath,
  TIMELAPSE_END_CARD_IMAGE_PATH,
} from "@/snapshot/paths";
import { type Bounds, calculateScale, clamp, normalizeBounds } from "@/utils";
import { getCanvasInfo } from "./canvasService";
import { getSnapshots } from "./snapshot/snapshotService";

const END_CARD_TRANSITION_DURATION_MS = 1_000;
const END_CARD_DISPLAY_DURATION_MS = 5_000;
const END_CARD_BACKGROUND_COLOR = {
  r: 88,
  g: 101,
  b: 242,
  alpha: 1,
} as const;

interface generateTimelapseParams {
  canvasId: CanvasInfo["id"];
  start?: Date;
  end?: Date;
  bounds?: Bounds;
  frameRate?: number;
  endHoldDurationMs?: number | null;
  showEndCard?: boolean;
  scale?: CanvasExportScale;
  backgroundColor?: PaletteColor["rgba"];
  raw?: boolean;
}

interface TimelapseCacheParams {
  canvasId: CanvasInfo["id"];
  canvasWidth: number;
  canvasHeight: number;
  requestedStartAt?: Date | undefined;
  requestedEndAt?: Date | undefined;
  effectiveStartAt: Date;
  effectiveEndAt: Date;
  cropBounds: Bounds | undefined;
  frameRate: number;
  endHoldDurationMs: number | null;
  showEndCard: boolean;
  scale: CanvasExportScale;
  backgroundColor: PaletteColor["rgba"];
  raw: boolean;
}

function buildTimelapseCacheKey({
  canvasId,
  effectiveStartAt,
  effectiveEndAt,
  cropBounds,
  frameRate,
  endHoldDurationMs,
  showEndCard,
  scale,
  backgroundColor,
  raw,
}: TimelapseCacheParams): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        canvasId,
        effectiveStartAt: effectiveStartAt.toISOString(),
        effectiveEndAt: effectiveEndAt.toISOString(),
        bounds:
          cropBounds ?
            {
              x0: cropBounds.x0,
              y0: cropBounds.y0,
              x1: cropBounds.x1,
              y1: cropBounds.y1,
            }
          : null,
        frameRate,
        endHoldDurationMs,
        showEndCard,
        scale,
        backgroundColor,
        raw,
      }),
    )
    .digest("hex");
}

function buildTimelapseManifestRecord(
  cacheParams: TimelapseCacheParams,
  cacheKey: string,
  filePath: string,
  fileSize: number,
) {
  return {
    canvas_id: cacheParams.canvasId,
    requested_start_at: cacheParams.requestedStartAt,
    requested_end_at: cacheParams.requestedEndAt,
    effective_start_at: cacheParams.effectiveStartAt,
    effective_end_at: cacheParams.effectiveEndAt,
    bounds_x0: cacheParams.cropBounds?.x0 ?? null,
    bounds_y0: cacheParams.cropBounds?.y0 ?? null,
    bounds_x1: cacheParams.cropBounds?.x1 ?? null,
    bounds_y1: cacheParams.cropBounds?.y1 ?? null,
    scale: cacheParams.scale,
    frame_rate: cacheParams.frameRate,
    end_hold_duration_ms: cacheParams.endHoldDurationMs ?? 0,
    show_end_card: cacheParams.showEndCard,
    background_color: JSON.stringify(cacheParams.backgroundColor),
    cache_key: cacheKey,
    file_path: filePath,
    file_size_bytes: fileSize,
  } as const;
}

async function readCachedTimelapse(filePath: string): Promise<Buffer | null> {
  try {
    await stat(filePath);
    return await readFile(filePath);
  } catch {
    return null;
  }
}

// Map of cacheKey -> Promise resolving to generated Buffer for in-flight requests
const inFlightTimelapses = new Map<string, Promise<Buffer>>();

async function getSnapshotCursorUpdatedAt(
  canvasId: CanvasInfo["id"],
): Promise<Date | null> {
  const cursor = await snapshotPrisma.snapshot_cursor.findUnique({
    where: { canvas_id: canvasId },
    select: { updated_at: true },
  });

  return cursor?.updated_at ?? null;
}

async function writeCachedTimelapseFile({
  finalPath,
  buffer,
}: {
  finalPath: string;
  buffer: Buffer;
}): Promise<number> {
  const tempPath = `${finalPath}.tmp-${process.pid}-${Date.now()}`;
  await writeFile(tempPath, buffer);

  try {
    await unlink(finalPath);
  } catch {
    // File may not exist yet; that's fine.
  }

  try {
    await rename(tempPath, finalPath);
    const fileStats = await stat(finalPath);
    return fileStats.size;
  } catch (error) {
    await unlink(tempPath).catch(() => undefined);
    throw error;
  }
}

async function runFfmpegProcess({
  ffmpegPath,
  args,
  captureStdout = false,
  onProcess,
}: {
  ffmpegPath: string;
  args: string[];
  captureStdout?: boolean;
  onProcess: (proc: ReturnType<typeof spawn>) => Promise<void>;
}): Promise<Buffer | undefined> {
  let outputChunks: Buffer[] | undefined;
  if (captureStdout) {
    outputChunks = [];
  }
  let stdErr = "";

  return await new Promise<Buffer | undefined>((resolve, reject) => {
    const proc = spawn(ffmpegPath, args, {
      stdio: ["pipe", captureStdout ? "pipe" : "ignore", "pipe"],
    });

    if (!proc.stdin || !proc.stderr) {
      reject(new Error("ffmpeg did not expose the expected stdio pipes"));
      return;
    }

    proc.stdout?.on("data", (chunk: Buffer) => outputChunks?.push(chunk));
    proc.stderr.on("data", (chunk: Buffer) => {
      stdErr += chunk.toString("utf8");
    });

    proc.on("error", (err) => {
      reject(new Error(`Failed to start ffmpeg: ${err.message}`));
    });

    proc.on("close", (code: number | null) => {
      if (code !== 0) {
        reject(
          new Error(
            `ffmpeg exited with code ${code}${stdErr ? `: ${stdErr.trim()}` : ""}`,
          ),
        );
        return;
      }

      resolve(captureStdout ? Buffer.concat(outputChunks ?? []) : undefined);
    });

    void onProcess(proc).catch((error) => {
      proc.stdin?.destroy();
      reject(error instanceof Error ? error : new Error(String(error)));
    });
  });
}

function getTimelapseVideoDimensions({
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
  const sourceWidth = cropBounds ? cropBounds.x1 - cropBounds.x0 : canvasWidth;
  const sourceHeight =
    cropBounds ? cropBounds.y1 - cropBounds.y0 : canvasHeight;

  return {
    width: Math.trunc((sourceWidth * scale) / 2) * 2,
    height: Math.trunc((sourceHeight * scale) / 2) * 2,
  };
}

async function createTimelapseEndCardBuffer({
  width,
  height,
}: {
  width: number;
  height: number;
}): Promise<Buffer> {
  const sourceBuffer = await readFile(TIMELAPSE_END_CARD_IMAGE_PATH);

  return await sharp(sourceBuffer)
    .resize({
      width,
      height,
      fit: "contain",
      position: "centre",
      background: END_CARD_BACKGROUND_COLOR,
    })
    .png()
    .toBuffer();
}

async function extractTimelapseLastFrameBuffer({
  timelapsePath,
  frameRate,
}: {
  timelapsePath: string;
  frameRate: number;
}): Promise<Buffer> {
  const ffmpegPath = ffmpegStatic;

  if (!ffmpegPath) {
    throw new Error("ffmpeg-static did not provide a binary path");
  }

  const lastFrameSeekSeconds = Math.max(1 / frameRate, 0.001);
  const lastFrameBuffer = await runFfmpegProcess({
    ffmpegPath,
    args: [
      "-hide_banner",
      "-loglevel",
      "error",
      "-sseof",
      `-${lastFrameSeekSeconds}`,
      "-i",
      timelapsePath,
      "-frames:v",
      "1",
      "-c:v",
      "png",
      "-f",
      "image2pipe",
      "pipe:1",
    ],
    captureStdout: true,
    onProcess: async () => undefined,
  });

  if (!lastFrameBuffer) {
    throw new Error(
      "ffmpeg produced empty output while extracting the final frame",
    );
  }

  return lastFrameBuffer;
}

async function streamImagePathsToFfmpegStdin({
  stdin,
  imagePaths,
}: {
  stdin: NodeJS.WritableStream;
  imagePaths: string[];
}): Promise<void> {
  for (const imagePath of imagePaths) {
    const imageBuffer = await readFile(imagePath);
    if (!stdin.write(imageBuffer)) {
      await new Promise((resolve) => stdin.once("drain", resolve));
    }
  }

  stdin.end();
}

function buildMainVideoEncodeArgs({
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
  outputFormat: "mp4" | "webm";
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
    ...(outputFormat === "webm" ? ["-lossless", "1", "-pix_fmt", "yuv444p"] : ["-pix_fmt", "yuv420p", "-movflags", "frag_keyframe+empty_moov"]),
    "-f",
    outputFormat,
    outputPath,
  ];
}

async function appendTimelapseEndCardTail({
  timelapseBuffer,
  frameRate,
  videoWidth,
  videoHeight,
  endHoldDurationMs,
}: {
  timelapseBuffer: Buffer;
  frameRate: number;
  videoWidth: number;
  videoHeight: number;
  endHoldDurationMs: number;
}): Promise<Buffer> {
  const ffmpegPath = ffmpegStatic;

  if (!ffmpegPath) {
    throw new Error("ffmpeg-static did not provide a binary path");
  }

  const tempPrefix = `${process.pid}-${Date.now()}`;
  const tempTimelapsePath = `${TIMELAPSE_END_CARD_IMAGE_PATH}.timelapse-${tempPrefix}.mp4`;
  const tempTailPath = `${TIMELAPSE_END_CARD_IMAGE_PATH}.tail-${tempPrefix}.mp4`;
  const tempLastFramePath = `${TIMELAPSE_END_CARD_IMAGE_PATH}.last-frame-${tempPrefix}.png`;
  const tempEndCardPath = `${TIMELAPSE_END_CARD_IMAGE_PATH}.end-card-${tempPrefix}.png`;
  const transitionDurationSeconds = END_CARD_TRANSITION_DURATION_MS / 1000;
  const endCardDisplayDurationSeconds = END_CARD_DISPLAY_DURATION_MS / 1000;
  const endHoldDurationSeconds = endHoldDurationMs / 1000;

  try {
    await writeFile(tempTimelapsePath, timelapseBuffer);
    await writeFile(
      tempLastFramePath,
      await extractTimelapseLastFrameBuffer({
        timelapsePath: tempTimelapsePath,
        frameRate,
      }),
    );
    await writeFile(
      tempEndCardPath,
      await createTimelapseEndCardBuffer({
        width: videoWidth,
        height: videoHeight,
      }),
    );
    await runFfmpegProcess({
      ffmpegPath,
      // Build a temporary "tail" video containing:
      // 1) a hold of the final timelapse frame for `endHoldDurationSeconds`
      // 2) a transition pair (last frame -> end-card) each `transitionDurationSeconds` long
      // 3) a hold of the end-card for `endCardDisplayDurationSeconds`
      // The inputs are passed as four looped inputs and the filter graph composes them
      args: [
        // General flags: hide the banner and only print errors
        "-hide_banner",
        "-loglevel",
        "error",

        // INPUT 0: loop the extracted final frame -> used as the initial hold segment
        "-loop",
        "1",
        "-framerate",
        String(frameRate),
        "-t",
        String(endHoldDurationSeconds),
        "-i",
        tempLastFramePath,

        // INPUT 1: loop the extracted final frame again -> used as the first half of the cross-fade
        "-loop",
        "1",
        "-framerate",
        String(frameRate),
        "-t",
        String(transitionDurationSeconds),
        "-i",
        tempLastFramePath,

        // INPUT 2: loop the generated end-card -> used as the second half of the cross-fade
        "-loop",
        "1",
        "-framerate",
        String(frameRate),
        "-t",
        String(transitionDurationSeconds),
        "-i",
        tempEndCardPath,

        // INPUT 3: loop the generated end-card -> used as the post-fade hold
        "-loop",
        "1",
        "-framerate",
        String(frameRate),
        "-t",
        String(endCardDisplayDurationSeconds),
        "-i",
        tempEndCardPath,

        // FILTER: create named segments, xfade the two short segments, then concat hold+transition+endHold
        "-filter_complex",
        [
          "[0:v]setpts=PTS-STARTPTS[hold]", // normalize pts for the hold segment
          "[1:v]setpts=PTS-STARTPTS[lastFade]", // normalize pts for first fade input
          "[2:v]setpts=PTS-STARTPTS[endFade]", // normalize pts for second fade input
          "[3:v]setpts=PTS-STARTPTS[endHold]", // normalize pts for end-card hold
          // xfade: ease the opacity blend between the two short segments using a smoothstep curve
          `[lastFade][endFade]xfade=transition=custom:duration=${transitionDurationSeconds}:offset=0:expr='A*(3*P*P-2*P*P*P)+B*(1-(3*P*P-2*P*P*P))'[transition]`,
          // concat: join hold, the produced transition, and the end-card hold into one stream
          "[hold][transition][endHold]concat=n=3:v=1:a=0[v]",
          "[v]format=yuv420p[vout]",
        ].join(";"),

        // map the composed stream to output, disable audio, encode to H.264 and write file
        "-map",
        "[vout]",
        "-an",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        // produce a fragmented MP4 suitable for streaming/writing quickly
        "-movflags",
        "frag_keyframe+empty_moov",
        "-f",
        "mp4",
        tempTailPath,
      ],
      onProcess: async () => undefined,
    });

    const tailBuffer = await runFfmpegProcess({
      ffmpegPath,
      // Concatenate the previously-generated main timelapse file and the tail file,
      // writing the combined MP4 to stdout for capture.
      args: [
        // general flags
        "-hide_banner",
        "-loglevel",
        "error",

        // INPUT 0: the main timelapse we just wrote
        "-i",
        tempTimelapsePath,
        // INPUT 1: the tail we produced above
        "-i",
        tempTailPath,

        // FILTER: normalize pts and concat main + tail into a single video stream
        "-filter_complex",
        "[0:v]setpts=PTS-STARTPTS[main];[1:v]setpts=PTS-STARTPTS[tail];[main][tail]concat=n=2:v=1:a=0[v]",

        // map, disable audio, encode, and emit to stdout (pipe:1) for capture
        "-map",
        "[v]",
        "-an",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "frag_keyframe+empty_moov",
        "-f",
        "mp4",
        "pipe:1",
      ],
      captureStdout: true,
      onProcess: async () => undefined,
    });

    if (!tailBuffer) {
      throw new Error("ffmpeg produced empty output");
    }

    return tailBuffer;
  } finally {
    await unlink(tempTimelapsePath).catch(() => undefined);
    await unlink(tempTailPath).catch(() => undefined);
    await unlink(tempLastFramePath).catch(() => undefined);
    await unlink(tempEndCardPath).catch(() => undefined);
  }
}

// Encode the main frames-only video from images (no appended end-card/tail).
async function encodeMainVideoFromImages({
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
  raw: boolean;
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

  const mainVideoBuffer = raw ? await (async () => {
    const tempOutputPath = join(
      tmpdir(),
      `${process.pid}-${Date.now()}.webm`,
    );

    try {
      await runFfmpegProcess({
        ffmpegPath,
        args: buildMainVideoEncodeArgs({
          frameRate,
          ffmpegBackgroundColor,
          filterGraph,
          outputPath: tempOutputPath,
          outputFormat: "webm",
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

      const outputBuffer = await readFile(tempOutputPath);
      if (!outputBuffer.length) {
        throw new Error("ffmpeg produced empty output");
      }

      return outputBuffer;
    } finally {
      await unlink(tempOutputPath).catch(() => undefined);
    }
  })() : await runFfmpegProcess({
    ffmpegPath,
    args: buildMainVideoEncodeArgs({
      frameRate,
      ffmpegBackgroundColor,
      filterGraph,
      outputPath: "pipe:1",
      outputFormat: "mp4",
    }),
    captureStdout: true,
    onProcess: async (proc) => {
      const stdin = proc.stdin;
      if (!stdin) {
        throw new Error("ffmpeg did not expose stdin");
      }

      await streamImagePathsToFfmpegStdin({ stdin, imagePaths });
    },
  });

  if (!mainVideoBuffer) {
    throw new Error("ffmpeg produced empty output");
  }

  return mainVideoBuffer;
}

export async function generateTimelapse({
  canvasId,
  start,
  end,
  bounds,
  frameRate = 30,
  endHoldDurationMs = 2000,
  showEndCard = true,
  scale,
  backgroundColor = [35, 39, 42, 255],
  raw = false,
}: generateTimelapseParams): Promise<Buffer> {
  // TODO: Configurable speed

  if (raw) {
    endHoldDurationMs = null;
    scale = 1;
    showEndCard = false;
  }

  /// Validate parameters

  if (!Number.isFinite(frameRate) || frameRate <= 0) {
    throw new Error("frameRate must be a positive number");
  }

  const snapshots = await getSnapshots({
    canvasId,
    from: start,
    to: end,
  });

  if (snapshots.length === 0) {
    throw new Error(`No snapshots found for canvas ${canvasId}`);
  }

  const orderedSnapshots = [...snapshots].sort(
    (a, b) => a.snapshot_at.getTime() - b.snapshot_at.getTime(),
  );

  const imagePaths = orderedSnapshots.map((s) => s.image_path);
  const effectiveStartAt = orderedSnapshots[0]?.snapshot_at;
  const effectiveEndAt = orderedSnapshots.at(-1)?.snapshot_at;

  if (!effectiveStartAt || !effectiveEndAt) {
    throw new Error(
      `Could not determine canonical snapshot bounds for canvas ${canvasId}`,
    );
  }

  let cropBounds: Bounds | undefined;
  const canvas = await getCanvasInfo(canvasId);

  if (bounds) {
    const normalizedBounds = normalizeBounds(bounds);

    const clampedBounds: Bounds = {
      x0: clamp(normalizedBounds.x0, 0, canvas.width - 1),
      y0: clamp(normalizedBounds.y0, 0, canvas.height - 1),
      x1: clamp(normalizedBounds.x1, 0, canvas.width - 1),
      y1: clamp(normalizedBounds.y1, 0, canvas.height - 1),
    };

    const cropWidth = clampedBounds.x1 - clampedBounds.x0;
    const cropHeight = clampedBounds.y1 - clampedBounds.y0;

    if (cropWidth <= 0 || cropHeight <= 0) {
      throw new Error("Bounds are invalid after normalization and clamping");
    }

    const isFullCanvasBounds =
      clampedBounds.x0 === 0 &&
      clampedBounds.y0 === 0 &&
      clampedBounds.x1 === canvas.width - 1 &&
      clampedBounds.y1 === canvas.height - 1;

    if (!isFullCanvasBounds) {
      cropBounds = clampedBounds;
    }
  }

  const resolvedScale =
    scale ??
    calculateScale(
      cropBounds ?
        (cropBounds.x1 - cropBounds.x0) * (cropBounds.y1 - cropBounds.y0)
      : canvas.width * canvas.height,
    );

  /// Check cache, return if exists

  return await getOrCreateTimelapseFromCache(
    {
      canvasId,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      requestedStartAt: start,
      requestedEndAt: end,
      effectiveStartAt,
      effectiveEndAt,
      cropBounds,
      frameRate,
      endHoldDurationMs,
      showEndCard,
      scale: resolvedScale,
      backgroundColor,
      raw,
    },
    imagePaths,
  );
}

async function getOrCreateTimelapseFromCache(
  cacheParams: TimelapseCacheParams,
  imagePaths: string[],
): Promise<Buffer> {
  const canvasId = cacheParams.canvasId;

  const cacheKey = buildTimelapseCacheKey(cacheParams);
  const timelapseFileName = `${cacheKey}.mp4`;
  const timelapseFilePath = getTimelapseVideoPath(canvasId, timelapseFileName);
  const currentCursorUpdatedAt = await getSnapshotCursorUpdatedAt(canvasId);

  const existingCache = await snapshotPrisma.timelapse_manifest.findUnique({
    where: { cache_key: cacheKey },
  });

  if (
    existingCache &&
    currentCursorUpdatedAt &&
    existingCache.updated_at >= currentCursorUpdatedAt
  ) {
    const cachedBuffer = await readCachedTimelapse(existingCache.file_path);
    if (cachedBuffer) {
      // Return from cache
      return cachedBuffer;
    }
  }

  // Coalesce concurrent identical requests: if a generation is already in-flight,
  // attach to that Promise and return its result instead of starting another.
  const existingInFlight = inFlightTimelapses.get(cacheKey);
  if (existingInFlight) {
    return await existingInFlight;
  }

  const generationPromise = (async () => {
    await mkdir(getTimelapseCanvasDirectory(canvasId), { recursive: true });

    // Ensure a raw frames-only timelapse (end_hold_duration_ms = 0) is generated
    // and cached before producing the augmented timelapse. This lets callers
    // request the raw variant later without re-encoding the frames.
    const rawCacheParams: TimelapseCacheParams = {
      ...cacheParams,
      endHoldDurationMs: null,
      showEndCard: false,
    };
    const rawCacheKey = buildTimelapseCacheKey(rawCacheParams);
    const rawFileName = `${rawCacheKey}.mp4`;
    const rawFilePath = getTimelapseVideoPath(canvasId, rawFileName);

    const rawBuffer = await encodeMainVideoFromImages({
      imagePaths,
      frameRate: cacheParams.frameRate,
      backgroundColor: cacheParams.backgroundColor,
      cropBounds: cacheParams.cropBounds,
      scale: cacheParams.scale,
      raw: cacheParams.raw,
    });

    if (cacheParams.raw) {
      const existingRaw = await snapshotPrisma.timelapse_manifest.findUnique({
        where: { cache_key: rawCacheKey },
      });
      if (
        !(
          existingRaw &&
          currentCursorUpdatedAt &&
          existingRaw.updated_at >= currentCursorUpdatedAt
        )
      ) {
        try {
          const rawSize = await writeCachedTimelapseFile({
            finalPath: rawFilePath,
            buffer: rawBuffer,
          });

          const rawManifest = buildTimelapseManifestRecord(
            cacheParams,
            rawCacheKey,
            rawFilePath,
            rawSize,
          );

          await snapshotPrisma.timelapse_manifest.upsert({
            where: { cache_key: rawCacheKey },
            create: rawManifest,
            update: rawManifest,
          });
        } catch (err) {
          await unlink(rawFilePath).catch(() => undefined);
          throw err;
        }
      }

      return rawBuffer;
    }

    const videoDimensions = getTimelapseVideoDimensions({
      canvasWidth: cacheParams.canvasWidth,
      canvasHeight: cacheParams.canvasHeight,
      cropBounds: cacheParams.cropBounds,
      scale: cacheParams.scale,
    });

    const generatedBuffer =
      cacheParams.showEndCard && cacheParams.endHoldDurationMs !== null ?
        await appendTimelapseEndCardTail({
          timelapseBuffer: rawBuffer,
          frameRate: cacheParams.frameRate,
          videoWidth: videoDimensions.width,
          videoHeight: videoDimensions.height,
          endHoldDurationMs: cacheParams.endHoldDurationMs ?? 0,
        })
      : rawBuffer;

    try {
      const fileSizeBytes = await writeCachedTimelapseFile({
        finalPath: timelapseFilePath,
        buffer: generatedBuffer,
      });

      const manifestRecord = buildTimelapseManifestRecord(
        cacheParams,
        cacheKey,
        timelapseFilePath,
        fileSizeBytes,
      );

      await snapshotPrisma.timelapse_manifest.upsert({
        where: { cache_key: cacheKey },
        create: manifestRecord,
        update: manifestRecord,
      });
    } catch (error) {
      await unlink(timelapseFilePath).catch(() => undefined);
      throw error;
    }

    return generatedBuffer;
  })();

  inFlightTimelapses.set(cacheKey, generationPromise);

  try {
    const result = await generationPromise;
    return result;
  } finally {
    inFlightTimelapses.delete(cacheKey);
  }
}
