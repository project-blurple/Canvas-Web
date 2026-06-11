import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
} from "@nestjs/common";
import type { Request } from "express";

import { LoggedInGuard } from "@/auth/guards/logged-in.guard";
import { ForbiddenError } from "@/common/errors/forbidden.error";
import { DiscordGuildService } from "@/discord/discord-guild.service";
import { DiscordTokenService } from "@/discord/discord-token.service";

@Injectable()
export class CanvasAdminGuard extends LoggedInGuard implements CanActivate {
  constructor(
    private readonly discordTokenService: DiscordTokenService,
    private readonly discordGuildService: DiscordGuildService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    await super.canActivate(context);
    const request = context.switchToHttp().getRequest<Request>();

    const userIsCanvasAdmin =
      await this.discordTokenService.withDiscordAccessToken(
        request.session,
        (accessToken) => this.discordGuildService.isCanvasAdmin(accessToken),
      );

    if (!userIsCanvasAdmin) {
      throw new ForbiddenError(
        "You do not have permission to perform this action",
      );
    }

    return true;
  }
}
