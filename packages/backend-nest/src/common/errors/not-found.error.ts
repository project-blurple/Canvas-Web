import { HttpStatus } from "@nestjs/common";
import { ApiError } from "./api.error";

export class NotFoundError extends ApiError {
  constructor(message: string) {
    super(message, HttpStatus.NOT_FOUND);
  }
}
