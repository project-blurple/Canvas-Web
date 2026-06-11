import { Module } from "@nestjs/common";

import { SessionStoreService } from "@/auth/session-store.service";

@Module({
  providers: [SessionStoreService],
  exports: [SessionStoreService],
})
export class AuthModule {}
