import ApiError from "./ApiError";

export default class UnprocessableError extends ApiError {
  constructor(message: string) {
    super(message, 422);
  }
}
