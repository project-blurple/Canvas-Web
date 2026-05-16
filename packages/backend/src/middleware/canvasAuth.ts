import type { DiscordUserProfile } from "@blurple-canvas-web/types/src/discordUserProfile";
import type { NextFunction, Request, Response } from "express";
import { ApiError, ForbiddenError, UnauthorizedError } from "@/errors";
import {
  isCanvasAdmin,
  isCanvasModerator,
} from "@/services/discordGuildService";
import { withDiscordAccessToken } from "@/services/discordTokenService";

interface AuthenticatedRequest extends Request {
  user: DiscordUserProfile;
  session: Request["session"] & {
    discordAccessToken: string;
    discordRefreshToken?: string;
    discordTokenExpiresAt?: number;
    discordTokenLifetimeMs?: number;
  };
}

export function assertLoggedIn(
  req: Request,
): asserts req is AuthenticatedRequest {
  if (
    !req.user ||
    !(req.session.discordAccessToken || req.session.discordRefreshToken)
  ) {
    throw new UnauthorizedError("User is not authenticated");
  }
}

export function requireLoggedIn(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    assertLoggedIn(req);
    next();
  } catch (error) {
    ApiError.sendError(res, error);
  }
}

export async function requireCanvasModerator(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    assertLoggedIn(req);

    const userIsCanvasModerator = await withDiscordAccessToken(
      req.session,
      isCanvasModerator,
    );

    if (!userIsCanvasModerator) {
      throw new ForbiddenError(
        "You do not have permission to perform this action",
      );
    }

    next();
  } catch (error) {
    ApiError.sendError(res, error);
  }
}

export async function requireCanvasAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    assertLoggedIn(req);

    const userIsCanvasAdmin = await withDiscordAccessToken(
      req.session,
      isCanvasAdmin,
    );

    if (!userIsCanvasAdmin) {
      throw new ForbiddenError(
        "You do not have permission to perform this action",
      );
    }

    next();
  } catch (error) {
    ApiError.sendError(res, error);
  }
}
