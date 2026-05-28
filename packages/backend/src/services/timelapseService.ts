import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import {
  type CanvasExportScale,
  type CanvasInfo,
  DEFAULT_CANVAS_EXPORT_SCALE,
} from "@blurple-canvas-web/types";
import ffmpegStatic from "ffmpeg-static";
import type { Bounds } from "@/utils";
import { getSnapshots } from "./snapshot/snapshotService";

interface generateTimelapseParams {
  canvasId: CanvasInfo["id"];
  from?: Date;
  to?: Date;
  bounds?: Bounds;
  frameRate?: number;
  endHoldDurationMs?: number;
  scale?: CanvasExportScale;
}

async function encodeMp4FromImages({
  imagePaths,
  frameRate,
}: {
  imagePaths: string[];
  frameRate: number;
}): Promise<Buffer> {
  const ffmpegPath = ffmpegStatic;

  if (!ffmpegPath) {
    throw new Error("ffmpeg-static did not provide a binary path");
  }

  const outputChunks: Buffer[] = [];
  let stdErr = "";

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
        for (const p of imagePaths) {
          const buf = await readFile(p);
          if (!proc.stdin.write(buf)) {
            await new Promise((res) => proc.stdin.once("drain", res));
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
  from,
  to,
  bounds,
  frameRate = 30,
  endHoldDurationMs = 2000,
  scale = DEFAULT_CANVAS_EXPORT_SCALE,
}: generateTimelapseParams): Promise<Buffer> {
  // Intentionally not implemented yet in this first iteration.
  void bounds;
  void endHoldDurationMs;
  void scale;

  if (!Number.isFinite(frameRate) || frameRate <= 0) {
    throw new Error("frameRate must be a positive number");
  }

  const snapshots = await getSnapshots({
    canvasId,
    from,
    to,
  });

  if (snapshots.length === 0) {
    throw new Error(`No snapshots found for canvas ${canvasId}`);
  }

  const orderedSnapshots = [...snapshots].sort(
    (a, b) => a.snapshot_at.getTime() - b.snapshot_at.getTime(),
  );

  const imagePaths = orderedSnapshots.map((s) => s.image_path);

  return await encodeMp4FromImages({ imagePaths, frameRate });
}
