import { spawn } from "node:child_process";
import { mkdir, readdir, stat, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";

import type { TimelapseConfig } from "@/config/timelapse.config";
import { timelapseConfig } from "@/config/timelapse.config";

const APP_TEMP_DIR_NAME = "com.blurplecanvas.canvas/timelapse";
const STALE_TEMP_FILE_AGE_MS = 60 * 60 * 1_000;

export interface FfmpegRunOptions {
  args: string[];
  stdinImagePaths?: string[];
  captureStdout?: boolean;
  timeoutMs?: number;
}

@Injectable()
export class FfmpegService implements OnModuleInit {
  private readonly logger = new Logger(FfmpegService.name);
  private resolvedPath: string | null = null;
  private tempDir: string | null = null;

  constructor(
    @Inject(timelapseConfig.KEY) private readonly config: TimelapseConfig,
  ) {}

  async onModuleInit(): Promise<void> {
    this.resolvedPath = await this.resolveFfmpegPath();

    if (!this.resolvedPath) {
      this.logger.error(
        "ffmpeg binary not found. Timelapse generation will be unavailable. " +
          "Set FFMPEG_PATH or install ffmpeg-static.",
      );
      return;
    }

    try {
      const version = await this.getFfmpegVersion();
      this.logger.log(`ffmpeg available: ${version}`);
    } catch (error) {
      this.logger.error("ffmpeg binary found but failed to run", error);
      this.resolvedPath = null;
    }

    await this.sweepStaleTempFiles();
  }

  getFfmpegPath(): string {
    if (!this.resolvedPath) {
      throw new Error(
        "ffmpeg is not available. Set FFMPEG_PATH or install ffmpeg-static.",
      );
    }
    return this.resolvedPath;
  }

  async getTempDir(): Promise<string> {
    if (!this.tempDir) {
      this.tempDir = path.join(tmpdir(), APP_TEMP_DIR_NAME);
      await mkdir(this.tempDir, { recursive: true });
    }
    return this.tempDir;
  }

  async run({
    args,
    stdinImagePaths,
    captureStdout = false,
    timeoutMs,
  }: FfmpegRunOptions): Promise<Buffer | undefined> {
    const ffmpegPath = this.getFfmpegPath();
    const effectiveTimeout = timeoutMs ?? this.config.encodeTimeoutMs;

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

      const timer = setTimeout(() => {
        proc.kill("SIGKILL");
        reject(
          new Error(
            `ffmpeg timed out after ${effectiveTimeout}ms — killing process`,
          ),
        );
      }, effectiveTimeout);

      proc.stdout?.on("data", (chunk: Buffer) => outputChunks?.push(chunk));
      proc.stderr.on("data", (chunk: Buffer) => {
        stdErr += chunk.toString("utf8");
      });

      proc.on("error", (err) => {
        clearTimeout(timer);
        reject(new Error(`Failed to start ffmpeg: ${err.message}`));
      });

      proc.on("close", (code: number | null) => {
        clearTimeout(timer);
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

      if (stdinImagePaths) {
        void this.streamImagePaths(proc.stdin, stdinImagePaths).catch(
          (error) => {
            proc.stdin?.destroy();
            reject(error instanceof Error ? error : new Error(String(error)));
          },
        );
      }
    });
  }

  private async streamImagePaths(
    stdin: NodeJS.WritableStream,
    imagePaths: string[],
  ): Promise<void> {
    const { readFile } = await import("node:fs/promises");

    for (const imagePath of imagePaths) {
      const imageBuffer = await readFile(imagePath);
      if (!stdin.write(imageBuffer)) {
        await this.waitForDrain(stdin);
      }
    }

    await new Promise<void>((resolve, reject) => {
      const onFinish = () => cleanup();
      const onError = (error: Error) => cleanup(error);

      function cleanup(error?: Error) {
        stdin.removeListener("finish", onFinish);
        stdin.removeListener("error", onError);
        if (error) reject(error);
        else resolve();
      }

      stdin.once("finish", onFinish);
      stdin.once("error", onError);
      stdin.end();
    });
  }

  private async waitForDrain(stdin: NodeJS.WritableStream): Promise<void> {
    return new Promise((resolve, reject) => {
      const onDrain = () => cleanup();
      const onError = (error: Error) => cleanup(error);
      const onClose = () =>
        cleanup(new Error("ffmpeg stdin closed before drain"));

      function cleanup(error?: Error) {
        stdin.removeListener("drain", onDrain);
        stdin.removeListener("error", onError);
        stdin.removeListener("close", onClose);
        if (error) reject(error);
        else resolve();
      }

      stdin.once("drain", onDrain);
      stdin.once("error", onError);
      stdin.once("close", onClose);
    });
  }

  private async resolveFfmpegPath(): Promise<string | null> {
    if (this.config.ffmpegPath) {
      return this.config.ffmpegPath;
    }

    try {
      const mod = await import("ffmpeg-static");
      const resolved = mod.default as unknown;
      return typeof resolved === "string" ? resolved : null;
    } catch {
      return null;
    }
  }

  private async getFfmpegVersion(): Promise<string> {
    const result = await this.run({
      args: ["-version"],
      captureStdout: true,
      timeoutMs: 5_000,
    });

    const output = result?.toString("utf8") ?? "";
    const firstLine = output.split("\n")[0] ?? "unknown";
    return firstLine.trim();
  }

  private async sweepStaleTempFiles(): Promise<void> {
    try {
      const tempDir = await this.getTempDir();
      const entries = await readdir(tempDir);
      const now = Date.now();
      let swept = 0;

      for (const entry of entries) {
        const filePath = path.join(tempDir, entry);
        const fileStat = await stat(filePath).catch(() => null);

        if (fileStat && now - fileStat.mtimeMs > STALE_TEMP_FILE_AGE_MS) {
          await unlink(filePath).catch(() => undefined);
          swept++;
        }
      }

      if (swept > 0) {
        this.logger.log(`Swept ${swept} stale temp file(s) from ${tempDir}`);
      }
    } catch {}
  }
}
