import type { DiscordUserProfile } from "@blurple-canvas-web/types";
import type { NextFunction, Request, Response } from "express";
import { ForbiddenError, UnauthorizedError } from "@/errors";
import {
  isCanvasAdmin,
  isCanvasModerator,
} from "@/services/discordGuildService";
import { withDiscordAccessToken } from "@/services/discordTokenService";

// biome-ignore lint/suspicious/noExplicitAny: This allows us to pass params to the Request generic that are not strings or string-only arrays
type AnyRequest = Request<any, any, any, any, any>;

export type AuthenticatedRequest<R extends AnyRequest = Request> = R & {
  user: DiscordUserProfile;
  session: R["session"] & {
    discordAccessToken: string;
    discordRefreshToken?: string;
    discordTokenExpiresAt?: number;
    discordTokenLifetimeMs?: number;
  };
};

export function assertLoggedIn<R extends AnyRequest>(
  req: R,
): asserts req is AuthenticatedRequest<R> {
  if (
    !req.user ||
    !(req.session.discordAccessToken || req.session.discordRefreshToken)
  ) {
    throw new UnauthorizedError("User is not authenticated");
  }
}

export function requireLoggedIn(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  try {
    assertLoggedIn(req);
    next();
  } catch (error) {
    next(error);
  }
}

export async function requireCanvasModerator(
  req: Request,
  _res: Response,
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
    next(error);
  }
}

export async function requireCanvasAdmin(
  req: Request,
  _res: Response,
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
    next(error);
  }
}
