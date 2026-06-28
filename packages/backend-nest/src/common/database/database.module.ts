import { Global, Module } from "@nestjs/common";

import { PrismaService } from "./core/prisma.service";
import { SnapshotPrismaService } from "./snapshot/snapshot-prisma.service";

@Global()
@Module({
  providers: [PrismaService, SnapshotPrismaService],
  exports: [PrismaService, SnapshotPrismaService],
})
export class DatabaseModule {}
