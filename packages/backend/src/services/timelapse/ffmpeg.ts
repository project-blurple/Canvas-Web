import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { APP_TEMP_DIR_NAME } from "./types";

export async function getAppTempDir(): Promise<string> {
  const appTempDir = join(tmpdir(), APP_TEMP_DIR_NAME);
  await mkdir(appTempDir, { recursive: true });
  return appTempDir;
}

export async function runFfmpegProcess({
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

export async function waitForStdinDrainOrError(
  stdin: NodeJS.WritableStream,
): Promise<void> {
  return await new Promise((resolve, reject) => {
    const onDrain = () => cleanup();
    const onError = (error: Error) => cleanup(error);
    const onClose = () =>
      cleanup(new Error("ffmpeg stdin closed before drain"));

    function cleanup(error?: Error) {
      stdin.removeListener("drain", onDrain);
      stdin.removeListener("error", onError);
      stdin.removeListener("close", onClose);

      if (error) {
        reject(error);
      } else {
        resolve();
      }
    }

    stdin.once("drain", onDrain);
    stdin.once("error", onError);
    stdin.once("close", onClose);
  });
}

export async function streamImagePathsToFfmpegStdin({
  stdin,
  imagePaths,
}: {
  stdin: NodeJS.WritableStream;
  imagePaths: string[];
}): Promise<void> {
  for (const imagePath of imagePaths) {
    const { readFile } = await import("fs/promises");
    const imageBuffer = await readFile(imagePath);
    if (!stdin.write(imageBuffer)) {
      await waitForStdinDrainOrError(stdin);
    }
  }

  await new Promise<void>((resolve, reject) => {
    const onFinish = () => cleanup();
    const onError = (error: Error) => cleanup(error);

    function cleanup(error?: Error) {
      stdin.removeListener("finish", onFinish);
      stdin.removeListener("error", onError);

      if (error) {
        reject(error);
      } else {
        resolve();
      }
    }

    stdin.once("finish", onFinish);
    stdin.once("error", onError);
    stdin.end();
  });
}
