import { exec } from "node:child_process";
import { promisify } from "node:util";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";

const execAsync = promisify(exec);
let container: StartedPostgreSqlContainer;

export async function setup() {
  container = await new PostgreSqlContainer("postgres:13.3-alpine").start();

  process.env.DATABASE_URL = container.getConnectionUri();
  await execAsync("npx prisma db push", {
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
  });
}

export async function teardown() {
  await container.stop();
}
