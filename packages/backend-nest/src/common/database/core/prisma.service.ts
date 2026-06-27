import {
  Inject,
  Injectable,
  OnApplicationShutdown,
  OnModuleInit,
} from "@nestjs/common";

import type { DatabaseConfig } from "@/config/database.config";
import { databaseConfig } from "@/config/database.config";
import { createPrismaClient, ExtendedPrismaClient } from "./prisma.client";

// `$extends` returns a new object rather than mutating the client, so a plain
// `class extends PrismaClient` would lose the Kysely extension. Instead the
// base "class" returns the extended client from its constructor, which makes
// `this` the extended client for the subclass — services get `prisma.<model>`
// and `prisma.$kysely` directly on the injected instance.
class ExtendedPrismaClientSetup {
  constructor(databaseUrl: string) {
    // biome-ignore lint/correctness/noConstructorReturn: Substitutes the extended client as `this` for the subclass.
    return createPrismaClient(databaseUrl);
  }
}

const ExtendedPrismaClientBase = ExtendedPrismaClientSetup as new (
  databaseUrl: string,
) => ExtendedPrismaClient;

@Injectable()
export class PrismaService
  extends ExtendedPrismaClientBase
  implements OnModuleInit, OnApplicationShutdown
{
  constructor(@Inject(databaseConfig.KEY) config: DatabaseConfig) {
    super(config.url);
  }

  // Instance fields (not prototype methods) so they are attached to the
  // extended client returned by the base constructor.
  onModuleInit = async (): Promise<void> => {
    await this.$connect();
  };

  onApplicationShutdown = async (): Promise<void> => {
    await this.$disconnect();
  };
}
