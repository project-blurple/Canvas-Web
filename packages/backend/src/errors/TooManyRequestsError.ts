import ApiError from "./ApiError";

export default class TooManyRequestsError extends ApiError {
  constructor(message: string) {
    super(message, 429);
  }
}
