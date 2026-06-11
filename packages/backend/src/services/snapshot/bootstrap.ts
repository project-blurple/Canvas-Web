import fs from "node:fs";
import Database from "better-sqlite3";
import { SNAPSHOT_DATABASE_PATH } from "@/snapshot/paths";

const REQUIRED_SNAPSHOT_TABLES = [
  "snapshot_manifest",
  "snapshot_cursor",
] as const;

export function assertSnapshotDatabaseReady(): void {
  if (!fs.existsSync(SNAPSHOT_DATABASE_PATH)) {
    throw new Error(
      `Snapshot generation is enabled, but the snapshot database is missing: ${SNAPSHOT_DATABASE_PATH}. Run pnpm --filter backend prisma:snapshots:migrate:deploy to create it.`,
    );
  }

  const database = new Database(SNAPSHOT_DATABASE_PATH, {
    readonly: true,
    fileMustExist: true,
  });

  try {
    const rows = database
      .prepare(
        `SELECT name FROM sqlite_master WHERE type = 'table' AND name IN (${REQUIRED_SNAPSHOT_TABLES.map(() => "?").join(", ")})`,
      )
      .all(...REQUIRED_SNAPSHOT_TABLES) as Array<{ name: string }>;

    const foundTables = new Set(rows.map((row) => row.name));
    const missingTables = REQUIRED_SNAPSHOT_TABLES.filter(
      (tableName) => !foundTables.has(tableName),
    );

    if (missingTables.length > 0) {
      throw new Error(
        `Snapshot generation is enabled, but the snapshot database is missing required tables: ${missingTables.join(", ")}. Run pnpm --filter backend prisma:snapshots:migrate:deploy to repair it.`,
      );
    }
  } finally {
    database.close();
  }
}
