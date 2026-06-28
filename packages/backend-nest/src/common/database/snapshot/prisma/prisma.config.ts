import path from "node:path";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "schema.prisma",
  migrations: {
    path: "migrations",
  },
  datasource: {
    url:
      process.env.SNAPSHOT_DATABASE_URL ??
      `file:${path.resolve(process.cwd(), "data", "snapshots", "snapshots.sqlite")}`,
  },
});
