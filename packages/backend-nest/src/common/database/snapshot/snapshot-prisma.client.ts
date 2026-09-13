import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "./generated/client";

/**
 * Builds the snapshot SQLite client. Unlike the core client (which is wrapped
 * with a Kysely extension via `$extends`), this client needs no extension, so a
 * plain `PrismaClient` is enough.
 *
 * Mirrors `createPrismaClient`: keeping client construction behind a factory
 * lets the test harness mock it so every `SnapshotPrismaService` is backed by
 * the test database.
 */
export function createSnapshotPrismaClient(databaseUrl: string) {
  return new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url: databaseUrl }),
  });
}

export type SnapshotPrismaClient = ReturnType<
  typeof createSnapshotPrismaClient
>;

export * from "./generated/client";
