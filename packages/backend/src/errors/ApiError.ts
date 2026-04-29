import type { Response } from "express";

export default class ApiError extends Error {
  constructor(
    message: string,
    protected status: number,
  ) {
    super(message);
  }

  /**
   * This provides a default way of applying an error to a response. Subclasses can override this
   * to provide more complex error responses.
   *
   * @param res The response to apply the error to
   */
  public applyToResponse(res: Response): void {
    res.status(this.status).json({ message: this.message });
  }

  public static sendError(res: Response, error: unknown): void {
    if (error instanceof ApiError) {
      error.applyToResponse(res);
    } else {
      console.error(error);
      res.status(500).json({ message: "An unexpected error occurred" });
    }
  }
}
