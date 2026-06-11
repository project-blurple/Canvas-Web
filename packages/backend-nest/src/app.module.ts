import { Module } from "@nestjs/common";
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from "@nestjs/core";
import { ZodSerializerInterceptor } from "nestjs-zod";

import { ApiExceptionFilter } from "@/common/api-exception.filter";
import { ZodValidationPipe } from "@/common/zod-validation.pipe";
import { AppConfigModule } from "@/config/config.module";

@Module({
  imports: [AppConfigModule],
  providers: [
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_INTERCEPTOR, useClass: ZodSerializerInterceptor },
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
  ],
})
export class AppModule {}
