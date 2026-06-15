import { Module } from "@nestjs/common";
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from "@nestjs/core";
import { ZodSerializerInterceptor } from "nestjs-zod";

import { AuditModule } from "@/audit/audit.module";
import { AuthModule } from "@/auth/auth.module";
import { BlocklistModule } from "@/blocklist/blocklist.module";
import { CanvasModule } from "@/canvas/canvas.module";
import { ApiExceptionFilter } from "@/common/api-exception.filter";
import { DatabaseModule } from "@/common/database/database.module";
import { ZodValidationPipe } from "@/common/zod-validation.pipe";
import { AppConfigModule } from "@/config/config.module";
import { EventModule } from "@/event/event.module";
import { FrameModule } from "@/frame/frame.module";
import { HistoryModule } from "@/history/history.module";
import { NoticeModule } from "@/notice/notice.module";
import { PaletteModule } from "@/palette/palette.module";
import { PixelModule } from "@/pixel/pixel.module";
import { RealtimeModule } from "@/realtime/realtime.module";

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    AuthModule,
    AuditModule,
    RealtimeModule,
    EventModule,
    CanvasModule,
    FrameModule,
    PixelModule,
    NoticeModule,
    BlocklistModule,
    PaletteModule,
    HistoryModule,
  ],
  providers: [
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_INTERCEPTOR, useClass: ZodSerializerInterceptor },
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
  ],
})
export class AppModule {}
