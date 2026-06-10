import { PrismaTestingHelper } from "@chax-at/transactional-prisma-testing";
import { afterAll, afterEach, beforeEach, vi } from "vitest";

import type { ExtendedPrismaClient } from "@/common/database/prisma.client";

let proxyClient: ExtendedPrismaClient | null = null;

//`vi.importActual` bypasses the mock below so the harness
// itself can reach the containerised database.
const harness = vi
  .importActual<
    typeof import("@/common/database/prisma.client")
  >("@/common/database/prisma.client")
  .then(({ createPrismaClient }) => {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error(
        "DATABASE_URL is not set — vitest.globalSetup.ts must run before the test harness.",
      );
    }
    const client = createPrismaClient(databaseUrl);
    const helper = new PrismaTestingHelper(client);
    proxyClient = helper.getProxyClient();
    return { client, helper };
  });

/**
 * A `PrismaService` stand-in backed by `@chax-at/transactional-prisma-testing`:
 * every call routes to the transaction opened for the current test (see the
 * hooks below) and is rolled back afterwards. Nested `$transaction` calls are
 * handled with savepoints by the library.
 *
 * `createPrismaClient` is mocked below, so every `PrismaService` instantiated
 * during tests is backed by this client automatically.
 * No provider override or per-file opt-in needed.
 */
export const testPrisma = new Proxy({} as ExtendedPrismaClient, {
  get(target, prop) {
    // PrismaService attaches its Nest lifecycle hooks as own instance fields.
    if (Reflect.has(target, prop)) {
      return Reflect.get(target, prop);
    }

    // The harness owns the connection lifecycle, not Nest.
    if (prop === "$connect" || prop === "$disconnect") {
      return () => Promise.resolve();
    }

    if (!proxyClient) {
      throw new Error("testPrisma used before the test harness initialised.");
    }
    return Reflect.get(proxyClient, prop);
  },
});

vi.mock("@/common/database/prisma.client", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/common/database/prisma.client")>();
  return {
    ...actual,
    createPrismaClient: () => testPrisma,
  };
});

beforeEach(async () => {
  const { helper } = await harness;
  await helper.startNewTransaction({ timeout: 30_000 });
});

afterEach(async () => {
  (await harness).helper.rollbackCurrentTransaction();
});

afterAll(async () => {
  await (await harness).client.$disconnect();
});

export async function resetSequence(sequenceName: string) {
  await testPrisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('${sequenceName}', 'id'), (SELECT COALESCE(MAX(id), 0) FROM ${sequenceName}) + 1, false);`,
  );
}
