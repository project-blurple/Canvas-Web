import { exec } from "node:child_process";
import { promisify } from "node:util";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";

const execAsync = promisify(exec);
let container: StartedPostgreSqlContainer;

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
  await execAsync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
  });
}

export async function teardown() {
  await container.stop();
}
