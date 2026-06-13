import { readFile, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import ffmpegStatic from "ffmpeg-static";
import sharp from "sharp";
import { TIMELAPSE_END_CARD_IMAGE_PATH } from "@/snapshot/paths";
import { getAppTempDir, runFfmpegProcess } from "./ffmpeg";
import {
  END_CARD_BACKGROUND_COLOR,
  END_CARD_DISPLAY_DURATION_MS,
  END_CARD_TRANSITION_DURATION_MS,
} from "./types";

export async function createTimelapseEndCardBuffer({
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

export async function extractTimelapseLastFrameBuffer({
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

export async function appendTimelapseEndCardTail({
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
  const appTempDir = await getAppTempDir();
  const tempTimelapsePath = join(appTempDir, `timelapse-${tempPrefix}.mp4`);
  const tempTailPath = join(appTempDir, `tail-${tempPrefix}.mp4`);
  const tempLastFramePath = join(appTempDir, `last-frame-${tempPrefix}.png`);
  const tempEndCardPath = join(appTempDir, `end-card-${tempPrefix}.png`);
  const tempConcatListPath = join(appTempDir, `concat-list-${tempPrefix}.txt`);
  const tempConcatPath = join(appTempDir, `concat-${tempPrefix}.mp4`);
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

    // Write concat demuxer list file for stream copy concatenation
    const concatListContent = `file '${tempTimelapsePath}'
file '${tempTailPath}'`;
    await writeFile(tempConcatListPath, concatListContent);

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

    // MP4 muxer requires seekable output, so write to a temp file instead of piping
    await runFfmpegProcess({
      ffmpegPath,
      // Concatenate the main timelapse and tail using the concat demuxer with stream copy.
      // Both inputs use identical H.264/yuv420p/MP4 encoding, so no re-encoding is needed.
      args: [
        // general flags
        "-hide_banner",
        "-loglevel",
        "error",

        // Use concat demuxer to splice files without re-encoding
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        tempConcatListPath,

        // Stream copy: copy both video and audio streams without re-encoding
        "-c",
        "copy",

        // Write to temp file (MP4 muxer requires seekable output)
        "-f",
        "mp4",
        tempConcatPath,
      ],
      onProcess: async () => undefined,
    });

    // Read the concatenated video from the temp file
    const tailBuffer = await readFile(tempConcatPath);

    if (!tailBuffer) {
      throw new Error("ffmpeg produced empty output");
    }

    return tailBuffer;
  } finally {
    await unlink(tempTimelapsePath).catch(() => undefined);
    await unlink(tempTailPath).catch(() => undefined);
    await unlink(tempLastFramePath).catch(() => undefined);
    await unlink(tempEndCardPath).catch(() => undefined);
    await unlink(tempConcatListPath).catch(() => undefined);
    await unlink(tempConcatPath).catch(() => undefined);
  }
}
