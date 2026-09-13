import { Global, Module } from "@nestjs/common";

import { PrismaService } from "./core/prisma.service";

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}
