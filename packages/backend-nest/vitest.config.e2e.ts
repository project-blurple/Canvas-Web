import path from "node:path";
import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

export default defineConfig({
  oxc: false,
  test: {
    globals: true,
    include: ["test/**/*.e2e-spec.ts"],
    fileParallelism: false,
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
  plugins: [
    swc.vite({
      module: { type: "es6" },
      // tsconfig targets ES2025, which @swc/core does not know about yet.
      jsc: { target: "es2024" },
    }),
  ],
});
