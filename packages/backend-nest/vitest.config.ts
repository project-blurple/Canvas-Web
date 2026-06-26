import path from "node:path";
import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Let SWC be the sole transformer (it emits the NestJS decorator metadata
  // that Vite's built-in transform does not support).
  oxc: false,
  test: {
    globals: true,
    include: ["src/**/*.spec.ts"],
    root: "./",
    globalSetup: ["./src/test/vitest.globalSetup.ts"],
    setupFiles: ["./src/test/database.ts"],
    env: {
      DISCORD_CLIENT_ID: "test-client-id",
      DISCORD_CLIENT_SECRET: "test-client-secret",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  plugins: [
    swc.vite({
      module: { type: "es6" },
      // tsconfig targets ES2025, which @swc/core does not know about yet.
      jsc: { target: "es2024" },
    }),
  ],
});
