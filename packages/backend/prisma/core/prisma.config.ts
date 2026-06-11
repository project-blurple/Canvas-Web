import dotenvx from "@dotenvx/dotenvx";
import { defineConfig } from "prisma/config";

dotenvx.config();

export default defineConfig({
  schema: "schema.prisma",
  views: {
    path: "prisma/views",
  },
  migrations: {
    path: "migrations",
    seed: "node --experimental-strip-types --experimental-specifier-resolution=node src/seed/index.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
