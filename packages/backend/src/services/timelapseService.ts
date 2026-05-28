import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import type {
  CanvasExportScale,
  CanvasInfo,
  PaletteColor,
} from "@blurple-canvas-web/types";
import ffmpegStatic from "ffmpeg-static";
import { type Bounds, calculateScale, clamp, normalizeBounds } from "@/utils";
import { getCanvasInfo } from "./canvasService";
import { getSnapshots } from "./snapshot/snapshotService";

interface generateTimelapseParams {
  canvasId: CanvasInfo["id"];
  start?: Date;
  end?: Date;
  bounds?: Bounds;
  frameRate?: number;
  endHoldDurationMs?: number;
  scale?: CanvasExportScale;
  backgroundColor?: PaletteColor["rgba"];
}

async function encodeMp4FromImages({
  imagePaths,
  frameRate,
  backgroundColor,
  cropBounds,
  endHoldDurationMs,
  scale,
}: {
  imagePaths: string[];
  frameRate: number;
  backgroundColor: PaletteColor["rgba"];
  cropBounds?: Bounds;
  endHoldDurationMs: number;
  scale: CanvasExportScale;
}): Promise<Buffer> {
  const ffmpegPath = ffmpegStatic;

  if (!ffmpegPath) {
    throw new Error("ffmpeg-static did not provide a binary path");
  }

  const outputChunks: Buffer[] = [];
  let stdErr = "";
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
  const endHoldFrameCount =
    endHoldDurationMs > 0 ?
      Math.max(0, Math.ceil((endHoldDurationMs * frameRate) / 1000))
    : 0;

  return await new Promise<Buffer>((resolve, reject) => {
    const proc = spawn(
      ffmpegPath,
      [
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
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "frag_keyframe+empty_moov",
        "-f",
        "mp4",
        "pipe:1",
      ],
      { stdio: ["pipe", "pipe", "pipe"] },
    );

    proc.stdout.on("data", (chunk: Buffer) => outputChunks.push(chunk));
    proc.stderr.on(
      "data",
      (chunk: Buffer) => (stdErr += chunk.toString("utf8")),
    );

    proc.on("error", (err) =>
      reject(new Error(`Failed to start ffmpeg: ${err.message}`)),
    );

    proc.on("close", (code: number | null) => {
      if (code !== 0) {
        reject(
          new Error(
            `ffmpeg exited with code ${code}${stdErr ? `: ${stdErr.trim()}` : ""}`,
          ),
        );
        return;
      }

      const out = Buffer.concat(outputChunks);
      if (out.length === 0) {
        reject(new Error("ffmpeg produced empty output"));
        return;
      }

      resolve(out);
    });

    // Stream each image file into ffmpeg stdin sequentially.
    (async () => {
      try {
        let lastFrameBuffer: Buffer | undefined;

        for (const p of imagePaths) {
          const buf = await readFile(p);
          lastFrameBuffer = buf;
          if (!proc.stdin.write(buf)) {
            await new Promise((res) => proc.stdin.once("drain", res));
          }
        }

        if (lastFrameBuffer && endHoldFrameCount > 0) {
          for (let index = 0; index < endHoldFrameCount; index += 1) {
            if (!proc.stdin.write(lastFrameBuffer)) {
              await new Promise((res) => proc.stdin.once("drain", res));
            }
          }
        }

        proc.stdin.end();
      } catch (err) {
        proc.stdin.destroy();
        reject(err as Error);
      }
    })();
  });
}

export async function generateTimelapse({
  canvasId,
  start,
  end,
  bounds,
  frameRate = 30,
  endHoldDurationMs = 2000,
  scale,
  backgroundColor = [35, 39, 42, 255],
}: generateTimelapseParams): Promise<Buffer> {
  // TODO: Configurable speed

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

  const autoScale = calculateScale(
    cropBounds ?
      (cropBounds.x1 - cropBounds.x0) * (cropBounds.y1 - cropBounds.y0)
    : canvas.width * canvas.height,
  );

  return await encodeMp4FromImages({
    imagePaths,
    frameRate,
    backgroundColor,
    cropBounds,
    endHoldDurationMs,
    scale: scale ?? autoScale,
  });
}
