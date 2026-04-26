import dotenvx from "@dotenvx/dotenvx";
import { defineConfig } from "prisma/config";

dotenvx.config({ ignore: ["MISSING_ENV_FILE"] });

export default defineConfig({
  schema: "prisma/schema.prisma",
  views: {
    path: "prisma/views",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
