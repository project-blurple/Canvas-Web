import type { PrismaClient } from "../../common/database/generated/client";

export type SeedClient = PrismaClient;

export interface Seeding {
  readonly name: string;
  /** Number of existing records; used to skip seeding unless --overwrite is passed. */
  count(prisma: SeedClient): Promise<number>;
  clean(prisma: SeedClient): Promise<void>;
  seed(prisma: SeedClient): Promise<void>;
}
