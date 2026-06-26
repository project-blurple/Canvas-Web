import {
  CanvasIdParamModel,
  PixelHistoryComplexBodyModel,
  PixelHistoryComplexParamModel,
  PixelHistoryDeleteBodyModel,
  PixelHistoryParamModel,
  PixelHistoryWrapperSchema,
  type Point,
} from "@blurple-canvas-web/types";
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import { ApiNoContentResponse, ApiOperation } from "@nestjs/swagger";
import { createZodDto, ZodResponse } from "nestjs-zod";

import { Audit } from "@/audit/audit.decorator";
import {
  RequiresCanvasAdmin,
  RequiresCanvasModerator,
} from "@/auth/require-auth.decorator";
import { CanvasService } from "@/canvas/canvas.service";
import { ForbiddenError } from "@/common/errors/forbidden.error";
import { HistoryQueryRateLimit } from "@/rate-limit/rate-limit.decorators";
import { AuthStatus } from "../auth/decorator/auth-status.decorator";
import type { GetPixelHistoryParams } from "./history.service";
import { HistoryService } from "./history.service";

class CanvasIdParamsDto extends createZodDto(CanvasIdParamModel) {}

class PixelHistoryParamsDto extends createZodDto(PixelHistoryParamModel) {}

class PixelHistoryComplexParamsDto extends createZodDto(
  PixelHistoryComplexParamModel,
) {}

class PixelHistoryComplexBodyDto extends createZodDto(
  PixelHistoryComplexBodyModel,
) {}

class PixelHistoryDeleteBodyDto extends createZodDto(
  PixelHistoryDeleteBodyModel,
) {}

class PixelHistoryWrapperResponseDto extends createZodDto(
  PixelHistoryWrapperSchema,
) {}

@Controller("canvas/:canvasId/pixel/history")
export class HistoryController {
  constructor(
    private readonly historyService: HistoryService,
    private readonly canvasService: CanvasService,
  ) {}

  @Get()
  @HistoryQueryRateLimit()
  @ApiOperation({ summary: "Paginated history for a single cell" })
  @ZodResponse({ type: PixelHistoryWrapperResponseDto })
  async getPixelHistory(
    @Param() params: CanvasIdParamsDto,
    @Query() query: PixelHistoryParamsDto,
    @AuthStatus() loggedIn: boolean,
  ) {
    const startedAt = performance.now();

    const pixelHistory = await this.historyService.getPixelHistorySummary(
      {
        canvasId: params.canvasId,
        points: { x: query.x, y: query.y },
        page: loggedIn ? query.page : 1,
        size: loggedIn ? query.size : 1,
      },
      false,
    );

    return {
      ...pixelHistory,
      executionDurationMs: performance.now() - startedAt,
    };
  }

  @Post()
  @RequiresCanvasModerator()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Region history with date/user/colour filters (summary + overlay)",
  })
  @ZodResponse({ type: PixelHistoryWrapperResponseDto })
  async queryPixelHistory(
    @Param() params: CanvasIdParamsDto,
    @Query() query: PixelHistoryComplexParamsDto,
    @Body() body: PixelHistoryComplexBodyDto,
  ) {
    const points: [Point, Point] = [
      { x: query.x0, y: query.y0 },
      { x: query.x1 ?? query.x0, y: query.y1 ?? query.y0 },
    ];

    const startedAt = performance.now();

    const pixelHistory = await this.historyService.getPixelHistorySummary(
      {
        canvasId: params.canvasId,
        points,
        page: query.page,
        size: query.size,
        ...this.buildFilters(body),
      },
      true,
    );

    return {
      ...pixelHistory,
      executionDurationMs: performance.now() - startedAt,
    };
  }

  @Delete()
  @RequiresCanvasModerator()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      "Soft-erase history (current event only); optionally block authors",
  })
  @ApiNoContentResponse({ description: "History erased" })
  async deletePixelHistory(
    @Param() params: CanvasIdParamsDto,
    @Body() body: PixelHistoryDeleteBodyDto,
    @Audit() audit: Audit,
  ): Promise<void> {
    if (!(await this.canvasService.isCanvasInCurrentEvent(params.canvasId))) {
      throw new ForbiddenError(
        "Cannot erase history for a canvas that is not in the current event",
      );
    }

    const { payload, shouldBlockAuthors } = this.buildDeletePayload(
      params.canvasId,
      body,
    );

    await this.historyService.deletePixelHistoryEntries(
      payload,
      shouldBlockAuthors,
    );

    audit.record({
      action: "pixel_history.delete",
      resourceId: params.canvasId,
      metadata: { filters: body, shouldBlockAuthors, forced: false },
    });
  }

  @Delete("force")
  @RequiresCanvasAdmin()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Force-erase history regardless of current event (admin only)",
  })
  @ApiNoContentResponse({ description: "History erased" })
  async forceDeletePixelHistory(
    @Param() params: CanvasIdParamsDto,
    @Body() body: PixelHistoryDeleteBodyDto,
    @Audit() audit: Audit,
  ): Promise<void> {
    const { payload, shouldBlockAuthors } = this.buildDeletePayload(
      params.canvasId,
      body,
    );

    await this.historyService.deletePixelHistoryEntries(
      payload,
      shouldBlockAuthors,
    );

    audit.record({
      action: "pixel_history.delete",
      resourceId: params.canvasId,
      metadata: { filters: body, shouldBlockAuthors, forced: true },
    });
  }

  /** Maps the complex body filters onto the service's filter shape. */
  private buildFilters(
    body: PixelHistoryComplexBodyDto,
  ): Pick<GetPixelHistoryParams, "dateRange" | "userIdFilter" | "colorFilter"> {
    const userIdFilter =
      body.includeUserIds ?
        { ids: body.includeUserIds.map(BigInt), include: true }
      : body.excludeUserIds ?
        { ids: body.excludeUserIds.map(BigInt), include: false }
      : undefined;

    const colorFilter =
      body.includeColors ? { colors: body.includeColors, include: true }
      : body.excludeColors ? { colors: body.excludeColors, include: false }
      : undefined;

    return {
      dateRange: { from: body.fromDateTime, to: body.toDateTime },
      userIdFilter,
      colorFilter,
    };
  }

  private buildDeletePayload(
    canvasId: number,
    body: PixelHistoryDeleteBodyDto,
  ): { payload: GetPixelHistoryParams; shouldBlockAuthors: boolean } {
    const points: [Point, Point] = [
      { x: body.x0, y: body.y0 },
      { x: body.x1 ?? body.x0, y: body.y1 ?? body.y0 },
    ];

    return {
      payload: {
        canvasId,
        points,
        ...this.buildFilters(body),
      },
      shouldBlockAuthors: body.shouldBlockAuthors ?? false,
    };
  }
}
