import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import {
  PrismaClientInitializationError,
  PrismaClientKnownRequestError,
  PrismaClientRustPanicError,
} from "@prisma/client/runtime/client";
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

    if (ApiExceptionFilter.isDatabaseUnavailableError(exception)) {
      response.status(503).json({ message: "Database is unavailable" });
      return;
    }

    const mappedPrismaError =
      ApiExceptionFilter.mapKnownPrismaRequestError(exception);
    if (mappedPrismaError) {
      response
        .status(mappedPrismaError.status)
        .json({ message: mappedPrismaError.message });
      return;
    }

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

  private static mapKnownPrismaRequestError(
    error: unknown,
  ): { status: number; message: string } | null {
    if (!(error instanceof PrismaClientKnownRequestError)) {
      return null;
    }

    switch (error.code) {
      case "P2025": // An operation failed because it depends on a missing record
        return { status: HttpStatus.NOT_FOUND, message: "Resource not found" };
      case "P2002": // Unique constraint violation
        return {
          status: HttpStatus.CONFLICT,
          message: "A resource with these details already exists",
        };
      default:
        return null;
    }
  }

  private static isDatabaseUnavailableError(error: unknown): boolean {
    if (
      error instanceof PrismaClientInitializationError ||
      error instanceof PrismaClientRustPanicError
    ) {
      return true;
    }

    if (error instanceof Error) {
      return /can't reach database server|database server is not reachable|ECONNREFUSED/i.test(
        error.message,
      );
    }

    return false;
  }
}
