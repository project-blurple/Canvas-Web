import type { z } from "zod";

export interface ApiErrorBody {
  message: string;
  errors?: z.core.$ZodIssue[];
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }

  /**
   * The JSON body for this error. Subclasses override this to provide more
   * complex error responses.
   */
  public toResponseBody(): ApiErrorBody {
    return { message: this.message };
  }
}
