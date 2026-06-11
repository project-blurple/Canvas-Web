import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
} from "@nestjs/common";
import { type Request } from "express";

import { UnauthorizedError } from "@/common/errors/unauthorized.error";

@Injectable()
export class LoggedInGuard implements CanActivate {
  canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    if (
      !request.user ||
      !(
        request.session.discordAccessToken ||
        request.session.discordRefreshToken
      )
    ) {
      throw new UnauthorizedError("User is not authenticated");
    }

    return Promise.resolve(true);
  }
}
