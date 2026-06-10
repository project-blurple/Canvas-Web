export const ConfigNamespace = {
  App: "app",
  Captcha: "captcha",
  Database: "database",
  Discord: "discord",
  Frames: "frames",
  Placement: "placement",
  Session: "session",
  Tracing: "tracing",
} as const;

export type ConfigNamespace =
  (typeof ConfigNamespace)[keyof typeof ConfigNamespace];
