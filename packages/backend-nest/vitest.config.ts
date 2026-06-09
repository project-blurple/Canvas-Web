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
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  plugins: [swc.vite({ module: { type: "es6" } })],
});
