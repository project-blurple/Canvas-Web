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
      WEB_PLACING_ENABLED: "true", // Ensure the POST /api/v1/canvas/:id/pixel endpoint is enabled
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
