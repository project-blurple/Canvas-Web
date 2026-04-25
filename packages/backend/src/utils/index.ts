// Make BigInt JSON serializable. See: https://github.com/GoogleChromeLabs/jsbi/issues/30

import type { Request } from "express";
import ApiError from "@/errors/ApiError";

// @ts-expect-error This causes an error when running the server because toJSON doesn't exist. (But that's okay because we're adding it here!)
BigInt.prototype.toJSON = function (): string {
  return this.toString();
};

interface AuthenticatedRequest extends Request {
  user: Express.User;
  session: Request["session"] & {
    discordAccessToken: string;
  };
}

export function assertLoggedIn(
  req: Request,
): asserts req is AuthenticatedRequest {
  if (!req.user || !req.session.discordAccessToken) {
    throw new ApiError("Unauthorized", 401);
  }
}
