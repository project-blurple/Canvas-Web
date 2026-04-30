import type z from "zod";
import { BadRequestError } from "@/errors";

export function assertZodSuccess(
  result: z.ZodSafeParseSuccess<unknown> | z.ZodSafeParseError<unknown>,
  message?: string,
): asserts result is z.ZodSafeParseSuccess<unknown> {
  if (!result.success) {
    throw new BadRequestError(
      message ?? "Invalid request data",
      result.error.issues,
    );
  }
}
