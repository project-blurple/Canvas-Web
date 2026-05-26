import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/client/snapshots/generated/client";
import { SNAPSHOT_DATABASE_URL } from "@/snapshot/paths";

const adapter = new PrismaBetterSqlite3({ url: SNAPSHOT_DATABASE_URL });

export const snapshotPrisma = new PrismaClient({ adapter });

export * from "@/client/snapshots/generated/client";