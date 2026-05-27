import { createApp } from "./app";
import { startSnapshotScheduler } from "./services/snapshot";

export const { socketHandler } = createApp();

startSnapshotScheduler();
