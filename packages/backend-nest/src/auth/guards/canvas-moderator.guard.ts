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
export class CanvasModeratorGuard extends LoggedInGuard implements CanActivate {
  constructor(
    private readonly discordTokenService: DiscordTokenService,
    private readonly discordGuildService: DiscordGuildService,
  ) {
    super();
  }

  override async canActivate(context: ExecutionContext): Promise<boolean> {
    await super.canActivate(context);
    const request = context.switchToHttp().getRequest<Request>();

    const userIsCanvasModerator =
      await this.discordTokenService.withDiscordAccessToken(
        request.session,
        (accessToken) =>
          this.discordGuildService.isCanvasModerator(accessToken),
      );

    if (!userIsCanvasModerator) {
      throw new ForbiddenError(
        "You do not have permission to perform this action",
      );
    }

    return true;
  }
}
