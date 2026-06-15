import {
  type BoundsInput,
  CanvasExportParamModel,
  type CanvasExportScale,
  CanvasIdParamModel,
  CanvasInfoSchema,
  CanvasPasteBodyModel,
  CanvasSummarySchema,
  CooldownSchema,
  CreateCanvasBodyModel,
  DEFAULT_CANVAS_EXPORT_SCALE,
  EditCanvasBodyModel,
  OptionalBoundsModel,
} from "@blurple-canvas-web/types";
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post,
  Put,
  Query,
  Res,
} from "@nestjs/common";
import {
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
} from "@nestjs/swagger";
import type { Response } from "express";
import { createZodDto, ZodResponse } from "nestjs-zod";
import { z } from "zod";

import { Audit } from "@/audit/audit.decorator";
import {
  CurrentUser,
  CurrentUserDto,
} from "@/auth/decorator/current-user.decorator";
import {
  RequiresCanvasAdmin,
  RequiresLogin,
} from "@/auth/require-auth.decorator";
import { CanvasService } from "./canvas.service";
import { type CachedCanvas, CanvasCacheService } from "./canvas-cache.service";
import { ExportService } from "./export.service";

class CanvasIdParamsDto extends createZodDto(CanvasIdParamModel) {}

class CanvasExportParamsDto extends createZodDto(CanvasExportParamModel) {}

// The schema transforms an absent crop to `undefined`, which a class cannot
// extend; the cast narrows the static type while keeping the runtime schema
// (handlers receive `BoundsInput`).
class CanvasCropQueryDto extends createZodDto(
  OptionalBoundsModel as z.ZodType<NonNullable<BoundsInput>>,
) {}

class CreateCanvasBodyDto extends createZodDto(CreateCanvasBodyModel) {}

class EditCanvasBodyDto extends createZodDto(EditCanvasBodyModel) {}

class CanvasPasteBodyDto extends createZodDto(CanvasPasteBodyModel) {}

class CanvasSummaryResponseDto extends createZodDto(
  CanvasSummarySchema.extend({
    cooldownDuration: z.number().int().nonnegative().nullable(),
  }),
) {}

class CanvasInfoResponseDto extends createZodDto(CanvasInfoSchema) {}

class CooldownResponseDto extends createZodDto(CooldownSchema) {}

/**
 * The raw canvas row, serialised with the database column names — parity with
 * the old backend, which returned the Prisma record directly.
 */
class CanvasRecordResponseDto extends createZodDto(
  z.object({
    id: z.number().int(),
    name: z.string(),
    locked: z.boolean(),
    event_id: z.number().int().nullable(),
    width: z.number().int(),
    height: z.number().int(),
    cooldown_length: z.number().int().nullable(),
    start_coordinates: z.array(z.number().int()),
    all_colors_global: z.boolean(),
  }),
) {}

class CanvasPasteResponseDto extends createZodDto(
  z.object({
    message: z.string(),
    count: z.number().int(),
  }),
) {}

@Controller("canvas")
export class CanvasController {
  private readonly logger = new Logger(CanvasController.name);

  constructor(
    private readonly canvasService: CanvasService,
    private readonly canvasCacheService: CanvasCacheService,
    private readonly exportService: ExportService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Summary of all canvases" })
  @ZodResponse({ type: [CanvasSummaryResponseDto] })
  async listCanvases() {
    return await this.canvasService.getCanvases();
  }

  @Get("current/info")
  @ApiOperation({ summary: "Info for the default canvas" })
  @ZodResponse({ type: CanvasInfoResponseDto })
  async currentCanvasInfo() {
    return await this.canvasService.getCurrentCanvasInfo();
  }

  @Get("current")
  @ApiOperation({ summary: "PNG of the default canvas" })
  @ApiProduces("image/png")
  @ApiOkResponse({ description: "The canvas image" })
  async currentCanvasPng(@Res() res: Response): Promise<void> {
    const canvasId = await this.canvasService.getDefaultCanvasId();
    const cachedCanvas = await this.canvasCacheService.getCanvasPng(canvasId);

    await this.sendCachedCanvas(res, canvasId, cachedCanvas);
  }

  @Get(":canvasId/info")
  @ApiOperation({ summary: "Canvas metadata (size, lock, cooldown, etc.)" })
  @ZodResponse({ type: CanvasInfoResponseDto })
  async canvasInfo(@Param() params: CanvasIdParamsDto) {
    return await this.canvasService.getCanvasInfo(params.canvasId);
  }

  @Get(":canvasId/cooldown/@me")
  @RequiresLogin()
  @ApiOperation({ summary: "The caller's remaining cooldown (ms)" })
  @ZodResponse({ type: CooldownResponseDto })
  async cooldown(
    @Param() params: CanvasIdParamsDto,
    @CurrentUser() user: CurrentUserDto,
  ) {
    const cooldownEndTime = await this.canvasService.getUserCanvasCooldown(
      params.canvasId,
      BigInt(user.id),
    );

    return {
      cooldownEndTime: cooldownEndTime ?? undefined,
    };
  }

  @Get(":canvasId@:scale.png")
  @ApiOperation({
    summary: "PNG of a canvas at scale (1/2/4×), with optional crop",
  })
  @ApiProduces("image/png")
  @ApiOkResponse({ description: "The canvas image" })
  async canvasPngAtScale(
    @Param() params: CanvasExportParamsDto,
    @Query() bounds: CanvasCropQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    const cachedCanvas = await this.canvasCacheService.getCanvasPng(
      params.canvasId,
    );

    await this.sendCachedCanvas(
      res,
      params.canvasId,
      cachedCanvas,
      params.scale,
      // The schema transforms an absent crop to `undefined`.
      bounds as BoundsInput,
    );
  }

  @Get(":canvasId")
  @ApiOperation({ summary: "PNG of a canvas" })
  @ApiProduces("image/png")
  @ApiOkResponse({ description: "The canvas image" })
  async canvasPng(
    @Param() params: CanvasIdParamsDto,
    @Res() res: Response,
  ): Promise<void> {
    const cachedCanvas = await this.canvasCacheService.getCanvasPng(
      params.canvasId,
    );

    await this.sendCachedCanvas(res, params.canvasId, cachedCanvas);
  }

  @Post()
  @RequiresCanvasAdmin()
  @ApiOperation({
    summary: "Create a canvas (locked, pixels initialised to blank)",
  })
  @ZodResponse({ status: HttpStatus.CREATED, type: CanvasRecordResponseDto })
  async createCanvas(@Body() body: CreateCanvasBodyDto, @Audit() audit: Audit) {
    const canvas = await this.canvasService.createCanvas(body);

    audit.record({
      action: "canvas.create",
      resourceId: canvas.id,
      metadata: body,
    });

    return this.toCanvasRecordResponse(canvas);
  }

  @Put(":canvasId")
  @RequiresCanvasAdmin()
  @ApiOperation({ summary: "Edit name/lock/cooldown/allColorsGlobal" })
  @ZodResponse({ type: CanvasRecordResponseDto })
  async editCanvas(
    @Param() params: CanvasIdParamsDto,
    @Body() body: EditCanvasBodyDto,
    @Audit() audit: Audit,
  ) {
    const canvas = await this.canvasService.editCanvas({
      canvasId: params.canvasId,
      ...body,
    });

    audit.record({
      action: "canvas.update",
      resourceId: canvas.id,
      metadata: body,
    });

    return this.toCanvasRecordResponse(canvas);
  }

  @Post(":canvasId/paste")
  @RequiresCanvasAdmin()
  @ApiOperation({
    summary: "Bulk-paste [x, y, colorId] triples onto a canvas",
  })
  @ZodResponse({ type: CanvasPasteResponseDto })
  async pasteCanvasData(
    @Param() params: CanvasIdParamsDto,
    @Body() body: CanvasPasteBodyDto,
    @Audit() audit: Audit,
  ) {
    const { authorId, data } = body;

    await this.canvasService.pasteCanvasData(
      params.canvasId,
      BigInt(authorId),
      data,
    );

    audit.record({
      action: "canvas.paste",
      resourceId: params.canvasId,
      metadata: {
        authorId: authorId.toString(),
        pixelCount: data.length,
        area: CanvasService.computePasteArea(data),
      },
    });

    return {
      message: "Canvas data pasted",
      count: data.length,
    };
  }

  @Delete(":canvasId/cache")
  @RequiresCanvasAdmin()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Evict a canvas from the in-memory and on-disk cache",
  })
  @ApiNoContentResponse({ description: "Cache evicted" })
  async clearCachedCanvas(
    @Param() params: CanvasIdParamsDto,
    @Audit() audit: Audit,
  ): Promise<void> {
    await this.canvasCacheService.clearCachedCanvas(params.canvasId);

    audit.record({
      action: "canvas.clearCache",
      resourceId: params.canvasId,
    });
  }

  private toCanvasRecordResponse(canvas: {
    id: number;
    name: string;
    locked: boolean;
    eventId: number | null;
    width: number;
    height: number;
    cooldownLength: number | null;
    startCoordinates: number[];
    allColorsGlobal: boolean;
  }): CanvasRecordResponseDto {
    return {
      id: canvas.id,
      name: canvas.name,
      locked: canvas.locked,
      event_id: canvas.eventId,
      width: canvas.width,
      height: canvas.height,
      cooldown_length: canvas.cooldownLength,
      start_coordinates: canvas.startCoordinates,
      all_colors_global: canvas.allColorsGlobal,
    };
  }

  private async sendCachedCanvas(
    res: Response,
    canvasId: number,
    cachedCanvas: CachedCanvas,
    scale: CanvasExportScale = DEFAULT_CANVAS_EXPORT_SCALE,
    bounds?: BoundsInput,
  ): Promise<void> {
    if (cachedCanvas.isLocked) {
      const canvasPath = cachedCanvas.canvasPaths[scale];

      if (!canvasPath) {
        throw new Error(
          `There is no cached canvas file for canvas ${canvasId} at ${scale}x`,
        );
      }

      await new Promise<void>((resolve, reject) => {
        res.sendFile(canvasPath, (error) =>
          error ? reject(error) : resolve(),
        );
      });
      return;
    }

    const stream =
      bounds ?
        await this.exportService.exportCanvasBoundsAsStream({
          canvasId,
          ...bounds,
          scale,
        })
      : this.exportService.unlockedCanvasToPngStream(cachedCanvas, scale);

    stream.on("error", (error) => {
      this.logger.error(`Error streaming canvas ${canvasId} PNG:`, error);
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
          `inline; filename="${this.canvasCacheService.getCanvasFilename(canvasId, false, scale, bounds)}"`,
        ),
    );
  }
}
