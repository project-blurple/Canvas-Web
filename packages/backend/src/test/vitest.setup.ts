import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, afterEach, beforeEach, vi } from "vitest";
import { Prisma, PrismaClient } from "@/client/generated/client";

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prismaClient = new PrismaClient({ adapter });

let transactionClient: Prisma.TransactionClient | null = null;
let endTestTransaction: (() => void) | null = null;
let savePointCounter = 0;

const prismaProxy = new Proxy({} as InstanceType<typeof PrismaClient>, {
  get(_target, prop) {
    if (!transactionClient) {
      throw new Error(
        "Prisma client accessed outside of an active test transaction.",
      );
    }

    if (prop === "$transaction") {
      return async (arg: unknown) => {
        const tx = transactionClient!;
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

    const value = transactionClient![prop as keyof Prisma.TransactionClient];
    return typeof value === "function" ? value.bind(transactionClient) : value;
  },
});

vi.mock("@/client", () => ({
  prisma: prismaProxy,
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
