import {
  CanvasIdParamModel,
  CreateFrameBodyModel,
  ExportFrameParamModel,
  FrameDataParamModel,
  FrameGuildIdsQueryModel,
  FrameIdParamModel,
  UserCanvasParamModel,
} from "@blurple-canvas-web/types";
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Logger,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
} from "@nestjs/common";
import {
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
} from "@nestjs/swagger";
import type { Request, Response } from "express";
import { createZodDto } from "nestjs-zod";

import {
  CurrentUser,
  CurrentUserDto,
} from "@/auth/decorator/current-user.decorator";
import { RequiresLogin } from "@/auth/require-auth.decorator";
import { ExportService } from "@/canvas/export.service";
import { type FramesConfig, framesConfig } from "@/config/frames.config";
import { DiscordTokenService } from "@/discord/discord-token.service";
import { FrameMutationRateLimit } from "@/rate-limit/rate-limit.decorators";
import { FrameService } from "./frame.service";

class ExportFrameParamsDto extends createZodDto(ExportFrameParamModel) {}

class FrameIdParamsDto extends createZodDto(FrameIdParamModel) {}

class UserCanvasParamsDto extends createZodDto(UserCanvasParamModel) {}

class CanvasIdParamsDto extends createZodDto(CanvasIdParamModel) {}

class FrameGuildIdsQueryDto extends createZodDto(FrameGuildIdsQueryModel) {}

class FrameDataBodyDto extends createZodDto(FrameDataParamModel) {}

class CreateFrameBodyDto extends createZodDto(CreateFrameBodyModel) {}

@Controller("frame")
export class FrameController {
  private readonly logger = new Logger(FrameController.name);

  constructor(
    private readonly frameService: FrameService,
    private readonly exportService: ExportService,
    private readonly discordTokenService: DiscordTokenService,
    @Inject(framesConfig.KEY) private readonly frames: FramesConfig,
  ) {}

  @Get(":frameId@:scale.png")
  @ApiOperation({ summary: "PNG of a frame's region at scale (1/2/4×)" })
  @ApiProduces("image/png")
  @ApiOkResponse({ description: "The frame image" })
  async exportFramePng(
    @Param() params: ExportFrameParamsDto,
    @Res() res: Response,
  ): Promise<void> {
    const frame = await this.frameService.getFrameById(params.frameId);

    const stream = await this.exportService.exportCanvasBoundsAsStream({
      canvasId: frame.canvasId,
      x0: frame.x0,
      y0: frame.y0,
      x1: frame.x1,
      y1: frame.y1,
      scale: params.scale,
    });

    stream.on("error", (error) => {
      this.logger.error(`Error streaming frame ${params.frameId} PNG:`, error);
      if (res.headersSent) {
        res.destroy(error);
      } else {
        res.sendStatus(500);
      }
    });

    stream.pipe(
      res
        .status(200)
        .type("png")
        .setHeader("Cache-Control", ["no-cache", "no-store"])
        // Needed to force Safari to not cache the image
        .setHeader("Vary", "*")
        .setHeader(
          "Content-Disposition",
          `inline; filename="frame-${params.frameId}.png"`,
        ),
    );
  }

  @Get(":frameId")
  @ApiOperation({ summary: "A frame by ID" })
  async getFrameById(@Param() params: FrameIdParamsDto) {
    return await this.frameService.getFrameById(params.frameId);
  }

  @Get("user/:userId/:canvasId")
  @ApiOperation({ summary: "A user's frames on a canvas" })
  async getFramesByUserId(@Param() params: UserCanvasParamsDto) {
    const frames = await this.frameService.getFramesByUserId(
      params.userId,
      params.canvasId,
    );

    return {
      data: frames,
      hasReachedMaxFrames: frames.length >= this.frames.maxAllowedUser,
    };
  }

  @Get("guilds/:canvasId")
  @ApiOperation({ summary: "Frames owned by the given guilds on a canvas" })
  async getFramesByGuildIds(
    @Param() params: CanvasIdParamsDto,
    @Query() query: FrameGuildIdsQueryDto,
  ) {
    const { guildIds } = query;
    const frames = await this.frameService.getFramesByGuildIds(
      guildIds,
      params.canvasId,
    );

    const hasReachedMaxFrames: Record<string, boolean> = {};
    for (const guildId of guildIds) {
      const frameCount = frames.reduce((count, frame) => {
        if (frame.owner.guild.guild_id === guildId) count++;
        return count;
      }, 0);
      hasReachedMaxFrames[guildId] = frameCount >= this.frames.maxAllowedGuild;
    }

    return {
      data: frames,
      hasReachedMaxFrames,
    };
  }

  @Put(":frameId/edit")
  @RequiresLogin()
  @FrameMutationRateLimit()
  @ApiOperation({ summary: "Edit a frame (owner or guild manager)" })
  async editFrame(
    @Param() params: FrameIdParamsDto,
    @Body() body: FrameDataBodyDto,
    @CurrentUser() user: CurrentUserDto,
    @Req() req: Request,
  ) {
    return await this.discordTokenService.withDiscordAccessToken(
      req.session,
      (accessToken) =>
        this.frameService.editFrame(
          user,
          accessToken,
          params.frameId,
          body.name,
          body.x0,
          body.y0,
          body.x1,
          body.y1,
        ),
    );
  }

  @Delete(":frameId/delete")
  @RequiresLogin()
  @FrameMutationRateLimit()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete a frame (owner or guild manager)" })
  @ApiNoContentResponse({ description: "Frame deleted" })
  async deleteFrame(
    @Param() params: FrameIdParamsDto,
    @CurrentUser() user: CurrentUserDto,
    @Req() req: Request,
  ): Promise<void> {
    await this.discordTokenService.withDiscordAccessToken(
      req.session,
      (accessToken) =>
        this.frameService.deleteFrame(user, accessToken, params.frameId),
    );
  }

  @Post()
  @RequiresLogin()
  @FrameMutationRateLimit()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a frame" })
  async createFrame(
    @Body() body: CreateFrameBodyDto,
    @CurrentUser() user: CurrentUserDto,
    @Req() req: Request,
  ) {
    const { canvasId, owner, name, x0, y0, x1, y1 } = body;

    await this.frameService.assertMaxOwnerFramesNotExceeded({
      canvasId,
      owner,
    });

    return await this.discordTokenService.withDiscordAccessToken(
      req.session,
      (accessToken) =>
        this.frameService.createFrame(
          user,
          accessToken,
          canvasId,
          name,
          owner,
          x0,
          y0,
          x1,
          y1,
        ),
    );
  }
}
