import { exec } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";

const execAsync = promisify(exec);
let container: StartedPostgreSqlContainer;
let snapshotDir: string | undefined;

export async function setup() {
  container = await new PostgreSqlContainer("postgres:17.9-alpine").start();

  // The add_database_functions migration assigns function ownership to the
  // `postgres` role, which Testcontainers' default database does not have.
  const { exitCode, output } = await container.exec([
    "psql",
    "-U",
    container.getUsername(),
    "-d",
    container.getDatabase(),
    "-c",
    "CREATE ROLE postgres;",
  ]);
  if (exitCode !== 0) {
    throw new Error(`Failed to create the postgres role: ${output}`);
  }

  // Propagates to the test workers, which are forked after global setup.
  process.env.DATABASE_URL = container.getConnectionUri();
  await execAsync(
    "npx prisma migrate deploy --config src/common/database/core/prisma/prisma.config.ts",
    {
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
    },
  );

  // The harness in `snapshot-database.ts` copies this template per worker.
  snapshotDir = mkdtempSync(path.join(tmpdir(), "blurple-snapshot-db-"));
  process.env.SNAPSHOT_DATABASE_URL = `file:${path.join(snapshotDir, "template.sqlite")}`;
  await execAsync(
    "npx prisma migrate deploy --config src/common/database/snapshot/prisma/prisma.config.ts",
    {
      env: {
        ...process.env,
        SNAPSHOT_DATABASE_URL: process.env.SNAPSHOT_DATABASE_URL,
      },
    },
  );
}

export async function teardown() {
  await container.stop();
  if (snapshotDir) {
    rmSync(snapshotDir, { recursive: true, force: true });
  }
}
