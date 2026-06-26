import { HttpStatus } from "@nestjs/common";
import { ApiError } from "./api.error";

export class ConflictError extends ApiError {
  constructor(message: string) {
    super(message, HttpStatus.CONFLICT);
  }
}
