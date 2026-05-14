import ApiError from "./ApiError";

export default class ConflictError extends ApiError {
  constructor(message: string) {
    super(message, 409);
  }
}
