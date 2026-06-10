import { PrismaPg } from "@prisma/adapter-pg";
import {
  CamelCasePlugin,
  Kysely,
  PostgresAdapter,
  PostgresIntrospector,
  PostgresQueryCompiler,
} from "kysely";
import kyselyExtension from "prisma-extension-kysely";
import { PrismaClient } from "./generated/client";
import type { DB } from "./kysely/types";

/**
 * Builds the dual-API client: Prisma (pg adapter) extended with a fully typed
 * `$kysely` instance that shares Prisma's connection (and transactions).
 *
 * The schema maps camelCase fields onto the snake_case database columns; the
 * CamelCasePlugin applies the same convention to `$kysely` queries.
 * `underscoreBeforeDigits` is required for columns like `frame.x_0` (`x0` in
 * the client API). Caveat: `session.expiresAt` is genuinely camelCase in the
 * database, so it must not be queried through `$kysely`.
 */
export function createPrismaClient(databaseUrl: string) {
  const adapter = new PrismaPg(databaseUrl);

  return new PrismaClient({ adapter }).$extends(
    kyselyExtension({
      kysely: (driver) =>
        new Kysely<DB>({
          dialect: {
            createDriver: () => driver,
            createAdapter: () => new PostgresAdapter(),
            createIntrospector: (db) => new PostgresIntrospector(db),
            createQueryCompiler: () => new PostgresQueryCompiler(),
          },
          plugins: [new CamelCasePlugin({ underscoreBeforeDigits: true })],
        }),
    }),
  );
}

export type ExtendedPrismaClient = ReturnType<typeof createPrismaClient>;

export * from "./generated/client";
