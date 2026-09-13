import type { DiscordUserProfile } from "@blurple-canvas-web/types";
import { type ExecutionContext, Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import type { Request } from "express";

import { RATE_LIMIT_BUCKET } from "./rate-limit.constants";

/**
 * Throttler guard that keys by the authenticated Discord user first and falls
 * back to the client IP, and buckets routes by `RATE_LIMIT_BUCKET` metadata so
 * related endpoints (e.g. frame create/edit/delete) share one budget.
 */
@Injectable()
export class UserOrIpThrottlerGuard extends ThrottlerGuard {
  protected override async shouldSkip(
    context: ExecutionContext,
  ): Promise<boolean> {
    return this.getBucket(context) === undefined;
  }

  protected override async getTracker(
    req: Record<string, unknown>,
  ): Promise<string> {
    const request = req as unknown as Request;
    const user = request.user as DiscordUserProfile | undefined;
    if (user?.id) {
      return `user-${user.id}`;
    }
    return UserOrIpThrottlerGuard.getClientIp(request);
  }

  protected override generateKey(
    context: ExecutionContext,
    suffix: string,
    name: string,
  ): string {
    const bucket =
      this.getBucket(context) ??
      `${context.getClass().name}-${context.getHandler().name}`;

    return `${bucket}-${name}-${suffix}`;
  }

  private getBucket(context: ExecutionContext): string | undefined {
    return this.reflector.getAllAndOverride<string | undefined>(
      RATE_LIMIT_BUCKET,
      [context.getHandler(), context.getClass()],
    );
  }

  /**
   * The real client behind the single Caddy hop is the first entry of
   * `X-Forwarded-For`; fall back to the socket IP when the header is absent.
   */
  private static getClientIp(req: Request): string {
    const forwardedFor = req.headers["x-forwarded-for"];
    if (forwardedFor) {
      const first =
        Array.isArray(forwardedFor) ?
          forwardedFor[0]
        : forwardedFor.split(",")[0];
      return first?.trim() ?? "";
    }
    return req.ip ?? "";
  }
}
