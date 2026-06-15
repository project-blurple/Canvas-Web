import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { EventEmitterModule } from "@nestjs/event-emitter";

import { CanvasAdminGuard } from "@/auth/guards/canvas-admin.guard";
import { DiscordModule } from "@/discord/discord.module";
import { AuditController } from "./audit.controller";
import { AuditInterceptor } from "./audit.interceptor";
import { AuditService } from "./audit.service";

@Module({
  imports: [EventEmitterModule.forRoot(), DiscordModule],
  controllers: [AuditController],
  providers: [
    AuditService,
    CanvasAdminGuard,
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
  exports: [AuditService],
})
export class AuditModule {}
