import type { DiscordUserProfile } from "@blurple-canvas-web/types/src/discordUserProfile";
import type { NextFunction, Request, Response } from "express";
import { ApiError, ForbiddenError, UnauthorizedError } from "@/errors";
import {
  isCanvasAdmin,
  isCanvasModerator,
} from "@/services/discordGuildService";

interface AuthenticatedRequest extends Request {
  user: DiscordUserProfile;
  session: Request["session"] & {
    discordAccessToken: string;
  };
}

export function assertLoggedIn(
  req: Request,
): asserts req is AuthenticatedRequest {
  if (!req.user || !req.session.discordAccessToken) {
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

    const accessToken = req.session.discordAccessToken;
    const userIsCanvasModerator = await isCanvasModerator(accessToken);

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

    const userIsCanvasAdmin = await isCanvasAdmin(
      req.session.discordAccessToken,
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
