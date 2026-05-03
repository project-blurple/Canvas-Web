import type z from "zod";
import { BadRequestError } from "@/errors";

export function assertZodSuccess<T>(
  result: z.ZodSafeParseSuccess<T> | z.ZodSafeParseError<T>,
  message?: string,
): asserts result is z.ZodSafeParseSuccess<T> {
  if (!result.success) {
    throw new BadRequestError(
      message ?? "Invalid request data",
      result.error.issues,
    );
  }
}
