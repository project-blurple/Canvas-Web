import { DiscordUserProfileSchema } from "@blurple-canvas-web/types";
import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { Request } from "express";
import { createZodDto } from "nestjs-zod";

/**
 * Injects the authenticated `req.user`. Custom param decorators run through
 * the global strict Zod pipe, so parameters must be typed as
 * `CurrentUserDto`. Use behind `LoggedInGuard` (or another guard that
 * guarantees `req.user`), since an absent user fails DTO validation.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<Request>().user,
);

export class CurrentUserDto extends createZodDto(DiscordUserProfileSchema) {}
