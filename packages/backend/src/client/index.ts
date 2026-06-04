import { PrismaPg } from "@prisma/adapter-pg";
import {
  Kysely,
  PostgresAdapter,
  PostgresIntrospector,
  PostgresQueryCompiler,
} from "kysely";
import kyselyExtension from "prisma-extension-kysely";
import { PrismaClient } from "@/client/generated/client";
import type { DB } from "@/client/kysely/types";
import config from "@/config";

const adapter = new PrismaPg(config.databaseUrl);

export const prisma = new PrismaClient({ adapter }).$extends(
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

export * from "@/client/generated/client";
