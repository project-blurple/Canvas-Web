import path from "node:path";
import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

export default defineConfig({
  oxc: false,
  test: {
    globals: true,
    include: ["test/**/*.e2e-spec.ts"],
    // setup-env.ts must run first: it provides the env vars that AppModule
    // needs at import time. database.ts wraps every test in a rolled-back
    // transaction, same as the unit suite.
    setupFiles: ["./test/setup-env.ts", "./src/test/database.ts"],
    root: "./",
    globalSetup: ["./src/test/vitest.globalSetup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  plugins: [swc.vite({ module: { type: "es6" } })],
});
