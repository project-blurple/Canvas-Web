import {
  AssignColorParamModel,
  ColorBodyModel,
  ColorIdParamModel,
  EventIdParamModel,
  PaletteColorSchema,
  PaletteQueryModel,
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
  Put,
  Query,
} from "@nestjs/common";
import { ApiNoContentResponse, ApiOperation } from "@nestjs/swagger";
import { createZodDto, ZodResponse } from "nestjs-zod";

import { Audit } from "@/audit/audit.decorator";
import { RequiresCanvasAdmin } from "@/auth/require-auth.decorator";
import { PaletteService } from "./palette.service";

class EventIdParamsDto extends createZodDto(EventIdParamModel) {}

class ColorIdParamsDto extends createZodDto(ColorIdParamModel) {}

class AssignColorParamsDto extends createZodDto(AssignColorParamModel) {}

class ColorBodyDto extends createZodDto(ColorBodyModel) {}

class PaletteQueryDto extends createZodDto(PaletteQueryModel) {}

class PaletteColorResponseDto extends createZodDto(PaletteColorSchema) {}

@Controller("palette")
export class PaletteController {
  constructor(private readonly paletteService: PaletteService) {}

  @Get("current")
  @ApiOperation({ summary: "Palette for the current event" })
  @ZodResponse({ type: [PaletteColorResponseDto] })
  async getCurrentEventPalette(@Query() query: PaletteQueryDto) {
    return await this.paletteService.getCurrentEventPalette(query.allColors);
  }

  @Get(":eventId")
  @ApiOperation({ summary: "Palette for a specific event" })
  @ZodResponse({ type: [PaletteColorResponseDto] })
  async getEventPalette(
    @Param() params: EventIdParamsDto,
    @Query() query: PaletteQueryDto,
  ) {
    return await this.paletteService.getEventPalette(
      params.eventId,
      query.allColors,
    );
  }

  @Post()
  @RequiresCanvasAdmin()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a colour (admin)" })
  async createColor(@Body() body: ColorBodyDto, @Audit() audit: Audit) {
    const color = await this.paletteService.createColor(body);

    audit.record({
      action: "color.create",
      resourceId: color.id,
      metadata: body,
    });

    return { message: "Color created" };
  }

  @Put(":colorId")
  @RequiresCanvasAdmin()
  @ApiOperation({ summary: "Edit a colour (admin)" })
  async editColor(
    @Param() params: ColorIdParamsDto,
    @Body() body: ColorBodyDto,
    @Audit() audit: Audit,
  ) {
    await this.paletteService.editColor({
      colorId: params.colorId,
      data: body,
    });

    audit.record({
      action: "color.update",
      resourceId: params.colorId,
      metadata: body,
    });

    return { message: "Color edited" };
  }

  @Delete(":colorId")
  @RequiresCanvasAdmin()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete a colour (admin)" })
  @ApiNoContentResponse({ description: "Colour deleted" })
  async deleteColor(
    @Param() params: ColorIdParamsDto,
    @Audit() audit: Audit,
  ): Promise<void> {
    await this.paletteService.deleteColor(params.colorId);

    audit.record({ action: "color.delete", resourceId: params.colorId });
  }

  @Post(":colorId/assign/:eventId/:guildId")
  @RequiresCanvasAdmin()
  @ApiOperation({ summary: "Assign a partner colour to an event (admin)" })
  async assignColorToEvent(
    @Param() params: AssignColorParamsDto,
    @Audit() audit: Audit,
  ) {
    await this.paletteService.assignColorToEvent({
      colorId: params.colorId,
      eventId: params.eventId,
      guildId: BigInt(params.guildId),
    });

    audit.record({
      action: "participation.assign",
      resourceId: `${params.colorId}:${params.eventId}:${params.guildId}`,
      metadata: {
        colorId: params.colorId,
        eventId: params.eventId,
        guildId: params.guildId,
      },
    });

    return { message: "Color assigned to event" };
  }

  @Delete(":colorId/assign/:eventId/:guildId")
  @RequiresCanvasAdmin()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Unassign a partner colour from an event (admin)" })
  @ApiNoContentResponse({ description: "Colour unassigned" })
  async unassignColorFromEvent(
    @Param() params: AssignColorParamsDto,
    @Audit() audit: Audit,
  ): Promise<void> {
    await this.paletteService.unassignColorFromEvent({
      eventId: params.eventId,
      guildId: BigInt(params.guildId),
    });

    audit.record({
      action: "participation.unassign",
      resourceId: `${params.colorId}:${params.eventId}:${params.guildId}`,
      metadata: {
        eventId: params.eventId,
        guildId: params.guildId,
      },
    });
  }
}
