import { readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { Inject, Injectable } from "@nestjs/common";
import sharp from "sharp";

import type { TimelapseConfig } from "@/config/timelapse.config";
import { timelapseConfig } from "@/config/timelapse.config";
import { FfmpegService } from "./ffmpeg.service";
import {
  END_CARD_BACKGROUND_COLOR,
  END_CARD_DISPLAY_DURATION_MS,
  END_CARD_TRANSITION_DURATION_MS,
} from "./timelapse.constants";

@Injectable()
export class TimelapseEndCardService {
  constructor(
    private readonly ffmpeg: FfmpegService,
    @Inject(timelapseConfig.KEY) private readonly config: TimelapseConfig,
  ) {}

  async appendEndCardTail({
    mainVideoPath,
    frameRate,
    videoWidth,
    videoHeight,
    endHoldDurationMs,
  }: {
    mainVideoPath: string;
    frameRate: number;
    videoWidth: number;
    videoHeight: number;
    endHoldDurationMs: number;
  }): Promise<string> {
    const tempDir = await this.ffmpeg.getTempDir();
    const tempPrefix = `${process.pid}-${Date.now()}`;
    const tempTailPath = path.join(tempDir, `tail-${tempPrefix}.mp4`);
    const tempLastFramePath = path.join(
      tempDir,
      `last-frame-${tempPrefix}.png`,
    );
    const tempEndCardPath = path.join(tempDir, `end-card-${tempPrefix}.png`);
    const tempConcatListPath = path.join(
      tempDir,
      `concat-list-${tempPrefix}.txt`,
    );
    const outputPath = path.join(tempDir, `concat-${tempPrefix}.mp4`);

    const transitionDurationSeconds = END_CARD_TRANSITION_DURATION_MS / 1_000;
    const endCardDisplayDurationSeconds = END_CARD_DISPLAY_DURATION_MS / 1_000;
    const endHoldDurationSeconds = endHoldDurationMs / 1_000;

    try {
      const lastFrameBuffer = await this.extractLastFrame(
        mainVideoPath,
        frameRate,
      );
      await writeFile(tempLastFramePath, lastFrameBuffer);

      const endCardBuffer = await this.createEndCardBuffer(
        videoWidth,
        videoHeight,
      );
      await writeFile(tempEndCardPath, endCardBuffer);

      const concatListContent = `file '${mainVideoPath}'\nfile '${tempTailPath}'`;
      await writeFile(tempConcatListPath, concatListContent);

      await this.ffmpeg.run({
        args: [
          "-hide_banner",
          "-loglevel",
          "error",
          "-loop",
          "1",
          "-framerate",
          String(frameRate),
          "-t",
          String(endHoldDurationSeconds),
          "-i",
          tempLastFramePath,
          "-loop",
          "1",
          "-framerate",
          String(frameRate),
          "-t",
          String(transitionDurationSeconds),
          "-i",
          tempLastFramePath,
          "-loop",
          "1",
          "-framerate",
          String(frameRate),
          "-t",
          String(transitionDurationSeconds),
          "-i",
          tempEndCardPath,
          "-loop",
          "1",
          "-framerate",
          String(frameRate),
          "-t",
          String(endCardDisplayDurationSeconds),
          "-i",
          tempEndCardPath,
          "-filter_complex",
          [
            "[0:v]setpts=PTS-STARTPTS[hold]",
            "[1:v]setpts=PTS-STARTPTS[lastFade]",
            "[2:v]setpts=PTS-STARTPTS[endFade]",
            "[3:v]setpts=PTS-STARTPTS[endHold]",
            `[lastFade][endFade]xfade=transition=custom:duration=${transitionDurationSeconds}:offset=0:expr='A*(3*P*P-2*P*P*P)+B*(1-(3*P*P-2*P*P*P))'[transition]`,
            "[hold][transition][endHold]concat=n=3:v=1:a=0[v]",
            "[v]format=yuv420p[vout]",
          ].join(";"),
          "-map",
          "[vout]",
          "-an",
          "-c:v",
          "libx264",
          "-pix_fmt",
          "yuv420p",
          "-movflags",
          "frag_keyframe+empty_moov",
          "-f",
          "mp4",
          tempTailPath,
        ],
      });

      // Stream-copy join: no re-encode.
      await this.ffmpeg.run({
        args: [
          "-hide_banner",
          "-loglevel",
          "error",
          "-f",
          "concat",
          "-safe",
          "0",
          "-i",
          tempConcatListPath,
          "-c",
          "copy",
          "-f",
          "mp4",
          outputPath,
        ],
      });

      return outputPath;
    } catch (error) {
      await unlink(outputPath).catch(() => undefined);
      throw error;
    } finally {
      await unlink(tempTailPath).catch(() => undefined);
      await unlink(tempLastFramePath).catch(() => undefined);
      await unlink(tempEndCardPath).catch(() => undefined);
      await unlink(tempConcatListPath).catch(() => undefined);
    }
  }

  private async extractLastFrame(
    videoPath: string,
    frameRate: number,
  ): Promise<Buffer> {
    const seekSeconds = Math.max(1 / frameRate, 0.001);

    const buffer = await this.ffmpeg.run({
      args: [
        "-hide_banner",
        "-loglevel",
        "error",
        "-sseof",
        `-${seekSeconds}`,
        "-i",
        videoPath,
        "-frames:v",
        "1",
        "-c:v",
        "png",
        "-f",
        "image2pipe",
        "pipe:1",
      ],
      captureStdout: true,
      timeoutMs: 30_000,
    });

    if (!buffer || buffer.length === 0) {
      throw new Error("ffmpeg produced empty output extracting the last frame");
    }
    return buffer;
  }

  private async createEndCardBuffer(
    width: number,
    height: number,
  ): Promise<Buffer> {
    const sourceBuffer = await readFile(this.config.endCardImagePath);
    return sharp(sourceBuffer)
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
}
