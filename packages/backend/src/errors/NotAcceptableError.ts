import ApiError from "./ApiError";

export default class NotAcceptableError extends ApiError {
  constructor(message: string) {
    super(message, 406);
  }
}
