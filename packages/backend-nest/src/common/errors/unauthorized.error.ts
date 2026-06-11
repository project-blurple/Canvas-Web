import { HttpStatus } from "@nestjs/common";
import { ApiError } from "./api.error";

export class UnauthorizedError extends ApiError {
  constructor(message: string) {
    super(message, HttpStatus.UNAUTHORIZED);
  }
}
