import fs from "node:fs";
import path from "node:path";
import { Logger } from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import { registerAs } from "@nestjs/config";
import {
  getSnapshotDatabaseUrl,
  SNAPSHOT_DATABASE_PATH,
  SNAPSHOT_IMAGE_ROOT,
} from "@/snapshot/snapshot-paths";
import { ConfigNamespace } from "./config-namespace";
import { validateEnv } from "./env";

const logger = new Logger("SnapshotConfig");

export const snapshotConfig = registerAs(ConfigNamespace.Snapshot, () => {
  const env = validateEnv(process.env);
  const generate = env.GENERATE_SNAPSHOTS === "true";

  const databasePath = SNAPSHOT_DATABASE_PATH;
  const imageRoot = SNAPSHOT_IMAGE_ROOT;

  if (generate) {
    fs.mkdirSync(path.dirname(databasePath), { recursive: true });
    fs.mkdirSync(imageRoot, { recursive: true });
    logger.debug(`Snapshot image directory at ${imageRoot}`);
  }

  return {
    generate,
    availableForCanvases: env.SNAPSHOTS_AVAILABLE_FOR_CANVASES,
    schedulerIntervalMs: env.SNAPSHOT_SCHEDULER_INTERVAL_MS,
    databasePath,
    databaseUrl: getSnapshotDatabaseUrl(databasePath),
    imageRoot,
  };
});

export type SnapshotConfig = ConfigType<typeof snapshotConfig>;
