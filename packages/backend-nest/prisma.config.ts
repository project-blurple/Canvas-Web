import dotenvx from "@dotenvx/dotenvx";
import { defineConfig } from "prisma/config";

dotenvx.config({ ignore: ["MISSING_ENV_FILE"], quiet: true });

export default defineConfig({
  schema: "src/common/database/prisma/schema.prisma",
  views: {
    path: "src/common/database/prisma/views",
  },
  migrations: {
    path: "src/common/database/prisma/migrations",
    seed: "tsx src/seed/index.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
