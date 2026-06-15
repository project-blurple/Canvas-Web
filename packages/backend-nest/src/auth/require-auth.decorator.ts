import { applyDecorators, UseGuards } from "@nestjs/common";
import {
  ApiCookieAuth,
  ApiExtension,
  ApiForbiddenResponse,
  ApiSecurity,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";

import { setActorRole } from "@/audit/audit.decorator";
import { BotApiKeyGuard } from "@/auth/guards/bot-api-key.guard";
import { CanvasAdminGuard } from "@/auth/guards/canvas-admin.guard";
import { CanvasModeratorGuard } from "@/auth/guards/canvas-moderator.guard";
import { LoggedInGuard } from "@/auth/guards/logged-in.guard";
import { ErrorResponseDto } from "@/common/error-response.dto";

/** Swagger security scheme names, registered in `setupSwagger`. */
export const SESSION_SECURITY = "session";
export const BOT_API_KEY_SECURITY = "bot-api-key";

/**
 * Internal marker listing the guards protecting an operation. `setupSwagger`
 * rewrites it into the operation's description and strips it from the
 * published document.
 */
export const GUARDS_EXTENSION = "x-guards";

/**
 * Routes that need a logged-in user. Applies `LoggedInGuard` and documents
 * the session-cookie requirement in Swagger (lock icon + 401 response).
 */
export function RequiresLogin() {
  return applyDecorators(
    UseGuards(LoggedInGuard),
    ApiCookieAuth(SESSION_SECURITY),
    ApiExtension(GUARDS_EXTENSION, [LoggedInGuard.name]),
    ApiUnauthorizedResponse({
      type: ErrorResponseDto,
      description: `${LoggedInGuard.name}: there is no authenticated session with Discord tokens`,
    }),
  );
}

/** Routes restricted to canvas admins. */
export function RequiresCanvasAdmin() {
  return applyDecorators(
    setActorRole("admin"),
    UseGuards(CanvasAdminGuard),
    ApiCookieAuth(SESSION_SECURITY),
    ApiExtension(GUARDS_EXTENSION, [CanvasAdminGuard.name]),
    ApiUnauthorizedResponse({
      type: ErrorResponseDto,
      description: `${CanvasAdminGuard.name}: there is no authenticated session with Discord tokens`,
    }),
    ApiForbiddenResponse({
      type: ErrorResponseDto,
      description: `${CanvasAdminGuard.name}: the user is not a canvas admin`,
    }),
  );
}

/** Routes restricted to canvas moderators. */
export function RequiresCanvasModerator() {
  return applyDecorators(
    setActorRole("moderator"),
    UseGuards(CanvasModeratorGuard),
    ApiCookieAuth(SESSION_SECURITY),
    ApiExtension(GUARDS_EXTENSION, [CanvasModeratorGuard.name]),
    ApiUnauthorizedResponse({
      type: ErrorResponseDto,
      description: `${CanvasModeratorGuard.name}: there is no authenticated session with Discord tokens`,
    }),
    ApiForbiddenResponse({
      type: ErrorResponseDto,
      description: `${CanvasModeratorGuard.name}: the user is not a canvas moderator`,
    }),
  );
}

/**
 * Routes reserved for the Discord bot, authenticated with the `x-api-key`
 * header (configurable through the Authorize dialog in Swagger UI).
 */
export function RequiresBotApiKey() {
  return applyDecorators(
    UseGuards(BotApiKeyGuard),
    ApiSecurity(BOT_API_KEY_SECURITY),
    ApiExtension(GUARDS_EXTENSION, [BotApiKeyGuard.name]),
    ApiUnauthorizedResponse({
      type: ErrorResponseDto,
      description: `${BotApiKeyGuard.name}: the \`x-api-key\` header is missing or invalid`,
    }),
  );
}
