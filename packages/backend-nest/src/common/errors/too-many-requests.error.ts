import { HttpStatus } from "@nestjs/common";
import { ApiError } from "./api.error";

export class TooManyRequestsError extends ApiError {
  constructor(message: string) {
    super(message, HttpStatus.TOO_MANY_REQUESTS);
  }
}
