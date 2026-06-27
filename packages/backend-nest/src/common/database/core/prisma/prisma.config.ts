import dotenvx from "@dotenvx/dotenvx";
import { defineConfig } from "prisma/config";

dotenvx.config({ ignore: ["MISSING_ENV_FILE"], quiet: true });

export default defineConfig({
  schema: "schema.prisma",
  views: {
    path: "views",
  },
  migrations: {
    path: "migrations",
    seed: "tsx src/seed/index.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
