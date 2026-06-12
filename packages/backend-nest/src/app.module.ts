import { Module } from "@nestjs/common";
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from "@nestjs/core";
import { ZodSerializerInterceptor } from "nestjs-zod";

import { AuthModule } from "@/auth/auth.module";
import { CanvasModule } from "@/canvas/canvas.module";
import { ApiExceptionFilter } from "@/common/api-exception.filter";
import { DatabaseModule } from "@/common/database/database.module";
import { ZodValidationPipe } from "@/common/zod-validation.pipe";
import { AppConfigModule } from "@/config/config.module";
import { RealtimeModule } from "@/realtime/realtime.module";

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    AuthModule,
    RealtimeModule,
    CanvasModule,
  ],
  providers: [
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_INTERCEPTOR, useClass: ZodSerializerInterceptor },
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
  ],
})
export class AppModule {}
