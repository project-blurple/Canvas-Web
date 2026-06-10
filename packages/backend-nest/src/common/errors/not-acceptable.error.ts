import { HttpStatus } from "@nestjs/common";
import type { z } from "zod";
import { ApiError, type ApiErrorBody } from "./api.error";

export class NotAcceptableError extends ApiError {
  constructor(
    message: string,
    protected errors: z.core.$ZodIssue[] = [],
  ) {
    super(message, HttpStatus.NOT_ACCEPTABLE);
  }

  public override toResponseBody(): ApiErrorBody {
    return { message: this.message, errors: this.errors };
  }
}
