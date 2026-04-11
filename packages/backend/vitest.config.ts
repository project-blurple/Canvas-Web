import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    setupFiles: ["./src/test/vitest.setup.ts"],
    globalSetup: "./src/test/vitest.globalSetup.ts",
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
});
