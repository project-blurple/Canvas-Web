import { createZodValidationPipe } from "nestjs-zod";
import { ZodError } from "zod";
import { BadRequestError } from "./errors/bad-request.error";

export const ZodValidationPipe = createZodValidationPipe({
  createValidationException: (error) =>
    new BadRequestError(
      "Invalid request data",
      error instanceof ZodError ? error.issues : [],
    ),
  strictSchemaDeclaration: true,
});
