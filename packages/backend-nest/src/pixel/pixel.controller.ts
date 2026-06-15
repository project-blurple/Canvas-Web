import {
  CanvasIdParamModel,
  PlacePixelArrayBodyModel,
  PlacePixelBodyModel,
  PlacePixelResponseModel,
  type Point,
} from "@blurple-canvas-web/types";
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Req,
} from "@nestjs/common";
import { ApiNoContentResponse, ApiOperation } from "@nestjs/swagger";
import type { Request } from "express";
import { createZodDto, ZodResponse } from "nestjs-zod";

import {
  CurrentUser,
  CurrentUserDto,
} from "@/auth/decorator/current-user.decorator";
import {
  RequiresBotApiKey,
  RequiresLogin,
} from "@/auth/require-auth.decorator";
import { CanvasCacheService } from "@/canvas/canvas-cache.service";
import { TurnstileService } from "@/captcha/turnstile.service";
import { ForbiddenError } from "@/common/errors/forbidden.error";
import {
  type PlacementConfig,
  placementConfig,
} from "@/config/placement.config";
import { DiscordGuildService } from "@/discord/discord-guild.service";
import { DiscordTokenService } from "@/discord/discord-token.service";
import { PixelPlacementRateLimit } from "@/rate-limit/rate-limit.decorators";
import { BroadcastService } from "@/realtime/broadcast.service";
import { PixelService } from "./pixel.service";

class CanvasIdParamsDto extends createZodDto(CanvasIdParamModel) {}

class PlacePixelBodyDto extends createZodDto(PlacePixelBodyModel) {}

class PlacePixelArrayBodyDto extends createZodDto(PlacePixelArrayBodyModel) {}

class PlacePixelResponseDto extends createZodDto(PlacePixelResponseModel) {}

@Controller("canvas/:canvasId/pixel")
export class PixelController {
  constructor(
    private readonly pixelService: PixelService,
    private readonly canvasCacheService: CanvasCacheService,
    private readonly broadcastService: BroadcastService,
    private readonly discordGuildService: DiscordGuildService,
    private readonly discordTokenService: DiscordTokenService,
    private readonly turnstileService: TurnstileService,
    @Inject(placementConfig.KEY)
    private readonly placementCfg: PlacementConfig,
  ) {}

  @Post("bot")
  @RequiresBotApiKey()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Update the canvas cache with pixels the bot already persisted",
    deprecated: true,
  })
  @ApiNoContentResponse({ description: "Cache updated and pixels broadcast" })
  placeBotPixels(
    @Param() params: CanvasIdParamsDto,
    @Body() body: PlacePixelArrayBodyDto,
  ): void {
    if (!this.placementCfg.botPlacingEnabled) {
      throw new ForbiddenError("Bot placing is disabled");
    }

    for (const pixel of body) {
      this.broadcastService.broadcastPixel(params.canvasId, pixel);
    }

    this.canvasCacheService.updateManyCachedPixels(params.canvasId, body);
  }

  @Post()
  @RequiresLogin()
  @PixelPlacementRateLimit()
  @ApiOperation({ summary: "Place a pixel on the canvas" })
  @ZodResponse({ status: HttpStatus.CREATED, type: PlacePixelResponseDto })
  async placePixel(
    @Param() params: CanvasIdParamsDto,
    @Body() body: PlacePixelBodyDto,
    @CurrentUser() user: CurrentUserDto,
    @Req() req: Request,
  ): Promise<PlacePixelResponseDto> {
    if (!this.placementCfg.webPlacingEnabled) {
      throw new ForbiddenError("Web placing is disabled");
    }

    const { x, y, colorId } = body;

    await this.turnstileService.verify(body.turnstileToken ?? "");

    const coordinates: Point = { x, y };
    const guildFlags = await this.discordTokenService.withDiscordAccessToken(
      req.session,
      (accessToken) =>
        this.discordGuildService.getCachedUserGuildFlags(
          req.session,
          accessToken,
        ),
    );
    const userGuildIds = new Set(Object.keys(guildFlags));

    const [color] = await Promise.all([
      this.pixelService.validateColor(colorId, params.canvasId, userGuildIds),
      this.pixelService.validatePixel(params.canvasId, coordinates, true),
      this.pixelService.validateUser(BigInt(user.id)),
    ]);

    const { futureCooldown } = await this.pixelService.placePixel(
      params.canvasId,
      BigInt(user.id),
      coordinates,
      color,
    );

    if (!futureCooldown) {
      return { cooldownEndTime: null };
    }

    return { cooldownEndTime: futureCooldown.valueOf() - Date.now() };
  }
}
