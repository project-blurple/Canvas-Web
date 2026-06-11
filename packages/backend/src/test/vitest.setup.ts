import { PrismaPg } from "@prisma/adapter-pg";
import {
  Kysely,
  PostgresAdapter,
  PostgresIntrospector,
  PostgresQueryCompiler,
} from "kysely";
import kyselyExtension from "prisma-extension-kysely";
import { afterAll, afterEach, beforeEach, vi } from "vitest";
import { Prisma, PrismaClient } from "@/client/core/generated/client";
import type { DB } from "@/client/core/kysely/types";

// biome-ignore lint/style/noNonNullAssertion: Database URL is required for tests to run
const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prismaClient = new PrismaClient({ adapter }).$extends(
  kyselyExtension({
    kysely: (driver) =>
      new Kysely<DB>({
        dialect: {
          createDriver: () => driver,
          createAdapter: () => new PostgresAdapter(),
          createIntrospector: (db) => new PostgresIntrospector(db),
          createQueryCompiler: () => new PostgresQueryCompiler(),
        },
      }),
  }),
);

type ExtendedTransactionClient = Parameters<
  Parameters<typeof prismaClient.$transaction>[0]
>[0];

let transactionClient: ExtendedTransactionClient | null = null;
let endTestTransaction: (() => void) | null = null;
let savePointCounter = 0;

const prismaProxy = new Proxy({} as InstanceType<typeof PrismaClient>, {
  get(_target, prop) {
    if (!transactionClient) {
      throw new Error(
        "Prisma client accessed outside of an active test transaction.",
      );
    }
    const tx = transactionClient;

    if (prop === "$transaction") {
      return async (arg: unknown) => {
        const id = `sp_${++savePointCounter}`;
        await tx.$executeRawUnsafe(`SAVEPOINT ${id};`);
        try {
          const result =
            Array.isArray(arg) ?
              await Promise.all(arg)
            : await (arg as (tx: unknown) => Promise<unknown>)(tx);
          await tx.$executeRawUnsafe(`RELEASE SAVEPOINT ${id};`);
          return result;
        } catch (err) {
          await tx.$executeRawUnsafe(`ROLLBACK TO SAVEPOINT ${id};`);
          throw err;
        }
      };
    }

    if (prop === "$connect" || prop === "$disconnect") {
      return () => Promise.resolve();
    }

    const value = transactionClient[prop as keyof ExtendedTransactionClient];
    return typeof value === "function" ? value.bind(transactionClient) : value;
  },
});

vi.mock("@/client", () => ({
  prisma: prismaProxy,
  Prisma,
}));

beforeEach(async () => {
  savePointCounter = 0;
  await new Promise<void>((resolve) => {
    prismaClient
      .$transaction(
        (tx) => {
          transactionClient = tx;
          resolve();
          return new Promise((_resolve, reject) => {
            endTestTransaction = () => {
              transactionClient = null;
              reject();
            };
          });
        },
        { timeout: 30_000 },
      )
      .catch(() => {});
  });
});

afterEach(() => {
  endTestTransaction?.();
  endTestTransaction = null;
});

afterAll(async () => {
  await prismaClient.$disconnect();
});
