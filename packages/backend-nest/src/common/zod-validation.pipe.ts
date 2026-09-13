import type { ArgumentMetadata, PipeTransform } from "@nestjs/common";
import { Injectable } from "@nestjs/common";
import { createZodValidationPipe } from "nestjs-zod";
import { isZodDto } from "nestjs-zod/dto";
import { ZodError } from "zod";

import { BadRequestError } from "./errors/bad-request.error";

const BaseZodValidationPipe: ReturnType<typeof createZodValidationPipe> =
  createZodValidationPipe({
    createValidationException: (error) =>
      new BadRequestError(
        "Invalid request data",
        error instanceof ZodError ? error.issues : [],
      ),
    strictSchemaDeclaration: true,
  });

@Injectable()
export class ZodValidationPipe
  extends BaseZodValidationPipe
  implements PipeTransform
{
  override transform(value: unknown, metadata: ArgumentMetadata): unknown {
    if (metadata.type === "custom" && !isZodDto(metadata.metatype)) {
      return value;
    }
    return super.transform(value, metadata);
  }
}
