export const ConfigNamespace = {
  App: "app",
  Captcha: "captcha",
  Database: "database",
  Discord: "discord",
  Frames: "frames",
  Placement: "placement",
  Session: "session",
  Snapshot: "snapshot",
  Telemetry: "telemetry",
  Timelapse: "timelapse",
} as const;

export type ConfigNamespace =
  (typeof ConfigNamespace)[keyof typeof ConfigNamespace];
