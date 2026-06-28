import { copyFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeEach, vi } from "vitest";

import type { SnapshotPrismaClient } from "@/common/database/snapshot/snapshot-prisma.client";

// Path to the migrated SQLite template built by `vitest.globalSetup.ts`; every
// per-worker snapshot DB is a copy of it.
function snapshotTemplatePath(): string {
  const url = process.env.SNAPSHOT_DATABASE_URL;
  if (!url) {
    throw new Error(
      "SNAPSHOT_DATABASE_URL is not set — vitest.globalSetup.ts must run before the test harness.",
    );
  }
  return url.replace(/^file:/, "");
}

let snapshotClient: SnapshotPrismaClient | null = null;

// Each worker gets its own copy of the template because parallel workers
// can't share one writable SQLite file.
const harness = vi
  .importActual<
    typeof import("@/common/database/snapshot/snapshot-prisma.client")
  >("@/common/database/snapshot/snapshot-prisma.client")
  .then(({ createSnapshotPrismaClient }) => {
    const directory = mkdtempSync(
      path.join(tmpdir(), "blurple-snapshot-worker-"),
    );
    const databasePath = path.join(directory, "snapshots.sqlite");
    copyFileSync(snapshotTemplatePath(), databasePath);
    const client = createSnapshotPrismaClient(`file:${databasePath}`);
    snapshotClient = client;
    return { client, directory };
  });

// Unlike Postgres we can't roll back per test (better-sqlite3 doesn't undo
// on rollback), so isolation is truncation in `beforeEach` instead.
export const testSnapshotPrisma = new Proxy({} as SnapshotPrismaClient, {
  get(target, prop) {
    if (Reflect.has(target, prop)) {
      return Reflect.get(target, prop);
    }

    // The harness owns the connection lifecycle, not Nest.
    if (prop === "$connect" || prop === "$disconnect") {
      return () => Promise.resolve();
    }

    if (!snapshotClient) {
      throw new Error(
        "testSnapshotPrisma used before the snapshot harness initialised.",
      );
    }
    return Reflect.get(snapshotClient, prop);
  },
});

vi.mock(
  "@/common/database/snapshot/snapshot-prisma.client",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import("@/common/database/snapshot/snapshot-prisma.client")
      >();
    return {
      ...actual,
      createSnapshotPrismaClient: () => testSnapshotPrisma,
    };
  },
);

export async function resetSnapshotDatabase(): Promise<void> {
  const { client } = await harness;
  await client.snapshotManifest.deleteMany();
  await client.snapshotCursor.deleteMany();
}

beforeEach(async () => {
  await resetSnapshotDatabase();
});

afterAll(async () => {
  const { client, directory } = await harness;
  await client.$disconnect();
  rmSync(directory, { recursive: true, force: true });
});
