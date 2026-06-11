import { createZodDto } from "nestjs-zod";
import { z } from "zod";

/** Error envelope produced by `ApiExceptionFilter`. */
export class ErrorResponseDto extends createZodDto(
  z.object({ message: z.string() }),
) {}
