import "./tracing";
import config from "@/config";
import { createApp } from "./app";
import { startSnapshotScheduler } from "./services/snapshot";
import { assertSnapshotDatabaseReady } from "./services/snapshot/bootstrap";

if (config.snapshot.generateSnapshots) {
  assertSnapshotDatabaseReady();
}

export const { socketHandler } = createApp();

startSnapshotScheduler();
