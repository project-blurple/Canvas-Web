import dotenvx from "@dotenvx/dotenvx";
import { defineConfig } from "prisma/config";

dotenvx.config();

export default defineConfig({
  schema: "prisma/schema.prisma",
  views: {
    path: "prisma/views",
  },
  migrations: {
    seed: "ts-node --esm prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
