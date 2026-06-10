export const ConfigNamespace = {
  App: "app",
  Captcha: "captcha",
  Database: "database",
  Discord: "discord",
  Frames: "frames",
  Placement: "placement",
  Session: "session",
  Telemetry: "telemetry",
} as const;

export type ConfigNamespace =
  (typeof ConfigNamespace)[keyof typeof ConfigNamespace];
