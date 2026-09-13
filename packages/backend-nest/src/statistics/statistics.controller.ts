import {
  CanvasColorStatsParamModel,
  CanvasIdParamModel,
  CanvasStatisticsSummarySchema,
  EventIdParamModel,
  EventStatisticsSummarySchema,
  FrameColorStatsParamModel,
  FrameIdParamModel,
  FrameStatisticsSummarySchema,
  LeaderboardEntrySchema,
  LeaderboardQueryModel,
  paginatedSchema,
  UserCanvasParamModel,
} from "@blurple-canvas-web/types";
import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiOperation } from "@nestjs/swagger";
import { createZodDto, ZodResponse } from "nestjs-zod";

import { StatisticsService } from "./statistics.service";

class UserCanvasParamsDto extends createZodDto(UserCanvasParamModel) {}

class CanvasIdParamsDto extends createZodDto(CanvasIdParamModel) {}

class CanvasColorStatsParamsDto extends createZodDto(
  CanvasColorStatsParamModel,
) {}

class FrameIdParamsDto extends createZodDto(FrameIdParamModel) {}

class FrameColorStatsParamsDto extends createZodDto(
  FrameColorStatsParamModel,
) {}

class EventIdParamsDto extends createZodDto(EventIdParamModel) {}

class LeaderboardQueryDto extends createZodDto(LeaderboardQueryModel) {}

class LeaderboardResponseDto extends createZodDto(
  paginatedSchema(LeaderboardEntrySchema),
) {}

class CanvasStatisticsSummaryResponseDto extends createZodDto(
  CanvasStatisticsSummarySchema,
) {}

class EventStatisticsSummaryResponseDto extends createZodDto(
  EventStatisticsSummarySchema,
) {}

class FrameStatisticsSummaryResponseDto extends createZodDto(
  FrameStatisticsSummarySchema,
) {}

@Controller("statistics")
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get("user/:userId/:canvasId")
  @ApiOperation({ summary: "A user's statistics on a canvas (null if none)" })
  async getUserStats(@Param() params: UserCanvasParamsDto) {
    return await this.statisticsService.getUserStats(
      params.userId,
      params.canvasId,
    );
  }

  @Get("leaderboard/canvas/:canvasId")
  @ApiOperation({ summary: "Paginated leaderboard for a canvas" })
  @ZodResponse({ type: LeaderboardResponseDto })
  async getCanvasLeaderboard(
    @Param() params: CanvasIdParamsDto,
    @Query() query: LeaderboardQueryDto,
  ) {
    return await this.statisticsService.getCanvasLeaderboard({
      canvasId: params.canvasId,
      page: query.page,
      size: query.size,
    });
  }

  @Get("leaderboard/canvas/:canvasId/color/:colorId")
  @ApiOperation({
    summary: "Paginated leaderboard for a canvas color",
  })
  @ZodResponse({ type: LeaderboardResponseDto })
  async getCanvasColorLeaderboard(
    @Param() params: CanvasColorStatsParamsDto,
    @Query() query: LeaderboardQueryDto,
  ) {
    return await this.statisticsService.getCanvasColorLeaderboard({
      canvasId: params.canvasId,
      colorId: params.colorId,
      page: query.page,
      size: query.size,
    });
  }

  @Get("leaderboard/frame/:frameId")
  @ApiOperation({ summary: "Paginated leaderboard for a frame" })
  @ZodResponse({ type: LeaderboardResponseDto })
  async getFrameLeaderboard(
    @Param() params: FrameIdParamsDto,
    @Query() query: LeaderboardQueryDto,
  ) {
    return await this.statisticsService.getFrameLeaderboard({
      frameId: params.frameId,
      page: query.page,
      size: query.size,
    });
  }

  @Get("leaderboard/frame/:frameId/color/:colorId")
  @ApiOperation({
    summary: "Paginated leaderboard for a frame color",
  })
  @ZodResponse({ type: LeaderboardResponseDto })
  async getFrameColorLeaderboard(
    @Param() params: FrameColorStatsParamsDto,
    @Query() query: LeaderboardQueryDto,
  ) {
    return await this.statisticsService.getFrameColorLeaderboard({
      frameId: params.frameId,
      colorId: params.colorId,
      page: query.page,
      size: query.size,
    });
  }

  @Get("summary/canvas/:canvasId")
  @ApiOperation({ summary: "Aggregate statistics for a canvas" })
  @ZodResponse({ type: CanvasStatisticsSummaryResponseDto })
  async getCanvasStatisticsSummary(@Param() params: CanvasIdParamsDto) {
    return await this.statisticsService.getCanvasStatisticsSummary(
      params.canvasId,
    );
  }

  @Get("summary/event/:eventId")
  @ApiOperation({ summary: "Aggregate statistics for an event" })
  @ZodResponse({ type: EventStatisticsSummaryResponseDto })
  async getEventStatisticsSummary(@Param() params: EventIdParamsDto) {
    return await this.statisticsService.getEventStatisticsSummary(
      params.eventId,
    );
  }

  @Get("summary/frame/:frameId")
  @ApiOperation({ summary: "Aggregate statistics for a frame" })
  @ZodResponse({ type: FrameStatisticsSummaryResponseDto })
  async getFrameStatisticsSummary(@Param() params: FrameIdParamsDto) {
    return await this.statisticsService.getFrameStatisticsSummary(
      params.frameId,
    );
  }
}
