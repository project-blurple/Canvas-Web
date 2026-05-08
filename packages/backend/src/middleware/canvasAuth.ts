import type { DiscordUserProfile } from "@blurple-canvas-web/types/src/discordUserProfile";
import type { NextFunction, Request, Response } from "express";
import { ApiError, ForbiddenError } from "@/errors";

interface AuthenticatedRequest extends Request {
  user: Express.User;
  session: Request["session"] & {
    discordAccessToken: string;
  };
}
interface CanvasAdminUser extends DiscordUserProfile {
  isCanvasAdmin: true;
}

interface CanvasModeratorUser extends DiscordUserProfile {
  isCanvasModerator: true;
}

export function assertLoggedIn(
  req: Request,
): asserts req is AuthenticatedRequest {
  if (!req.user || !req.session.discordAccessToken) {
    throw new ApiError("Unauthorized", 401);
  }
}

function assertCanvasAdmin(
  user: DiscordUserProfile,
): asserts user is CanvasAdminUser {
  if (!user.isCanvasAdmin) {
    throw new ForbiddenError(
      "You do not have permission to perform this action",
    );
  }
}

function assertIsCanvasModerator(
  user: DiscordUserProfile,
): asserts user is CanvasModeratorUser | CanvasAdminUser {
  if (!user.isCanvasModerator) {
    throw new ForbiddenError(
      "You do not have permission to perform this action",
    );
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

export function requireCanvasModerator(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    assertLoggedIn(req);
    assertIsCanvasModerator(req.user);
    next();
  } catch (error) {
    ApiError.sendError(res, error);
  }
}

export function requireCanvasAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    assertLoggedIn(req);
    assertCanvasAdmin(req.user);
    next();
  } catch (error) {
    ApiError.sendError(res, error);
  }
}
