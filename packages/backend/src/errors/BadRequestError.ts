import type { Response } from "express";
import type { z } from "zod";
import ApiError from "./ApiError";

export default class BadRequestError extends ApiError {
  constructor(
    message: string,
    protected errors: z.core.$ZodIssue[] = [],
  ) {
    super(message, 400);
  }

  public applyToResponse(res: Response): void {
    res
      .status(this.status)
      .json({ message: this.message, errors: this.errors });
  }
}
