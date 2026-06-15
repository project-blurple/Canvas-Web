import {
  CanvasIdParamModel,
  CanvasStatisticsSummarySchema,
  EventIdParamModel,
  EventStatisticsSummarySchema,
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

  @Get("leaderboard/:canvasId")
  @ApiOperation({ summary: "Paginated leaderboard for a canvas (size ≤ 40)" })
  @ZodResponse({ type: LeaderboardResponseDto })
  async getLeaderboard(
    @Param() params: CanvasIdParamsDto,
    @Query() query: LeaderboardQueryDto,
  ) {
    return await this.statisticsService.getLeaderboard(
      params.canvasId,
      query.page,
      query.size,
    );
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
}
