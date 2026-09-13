import { HttpStatus } from "@nestjs/common";
import { ApiError } from "./api.error";

export class UnprocessableError extends ApiError {
  constructor(message: string) {
    super(message, HttpStatus.UNPROCESSABLE_ENTITY);
  }
}
