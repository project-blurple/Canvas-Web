import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  Logger,
} from "@nestjs/common";
import type { Response } from "express";
import { ZodSerializationException } from "nestjs-zod";
import { ApiError } from "./errors/api.error";

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);
  public catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    // Mid-stream failure (e.g. streamed canvas images): headers are already
    // out, so no JSON envelope can follow. Like Express's default error
    // handler, close the connection so the client sees a truncated response
    // rather than a cleanly-ended partial one.
    if (response.headersSent) {
      response.destroy();
      return;
    }

    if (exception instanceof ApiError) {
      response.status(exception.status).json(exception.toResponseBody());
      return;
    }

    // Thrown by ZodSerializerInterceptor when a response body fails its
    // schema. This is an HttpException subclass, so it must be handled before
    // the generic HttpException branch — Nest's default "Internal Server
    // Error" message would break the parity envelope.
    if (exception instanceof ZodSerializationException) {
      this.logger.error(exception.getZodError());
      response.status(500).json({ message: "An unexpected error occurred" });
      return;
    }

    // TODO: Database unavailable detection
    // if (isDatabaseUnavailableError(exception)) {
    //   response.status(503).json({ message: "Database is unavailable" });
    //   return;
    // }

    // Framework-internal exceptions (unknown-route 404s, body-parser 400s,
    // ...) are mapped onto the same envelope.
    if (exception instanceof HttpException) {
      response
        .status(exception.getStatus())
        .json({ message: exception.message });
      return;
    }

    this.logger.error(exception);
    response.status(500).json({ message: "An unexpected error occurred" });
  }
}
