import {
  BlurpleEventSchema,
  CreateEventBodyModel,
  EditEventBodyModel,
  EventIdParamModel,
} from "@blurple-canvas-web/types";
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
} from "@nestjs/common";
import { ApiOperation } from "@nestjs/swagger";
import { createZodDto, ZodResponse } from "nestjs-zod";
import { Audit } from "@/audit/audit.decorator";
import { RequiresCanvasAdmin } from "@/auth/require-auth.decorator";
import { EventService } from "./event.service";

class EventIdParamsDto extends createZodDto(EventIdParamModel) {}

class CreateEventBodyDto extends createZodDto(CreateEventBodyModel) {}

class EditEventBodyDto extends createZodDto(EditEventBodyModel) {}

class BlurpleEventResponseDto extends createZodDto(BlurpleEventSchema) {}

@Controller("event")
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Get("current")
  @ApiOperation({ summary: "The current event" })
  @ZodResponse({ type: BlurpleEventResponseDto })
  async getCurrentEvent() {
    return await this.eventService.getCurrentEvent();
  }

  @Get(":eventId")
  @ApiOperation({ summary: "An event by ID" })
  @ZodResponse({ type: BlurpleEventResponseDto })
  async getEventById(@Param() params: EventIdParamsDto) {
    return await this.eventService.getEventById(params.eventId);
  }

  @Post()
  @RequiresCanvasAdmin()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create an event (admin)" })
  @ZodResponse({ status: HttpStatus.CREATED, type: BlurpleEventResponseDto })
  async createEvent(@Body() body: CreateEventBodyDto, @Audit() audit: Audit) {
    const event = await this.eventService.createEvent(body.name, body.id);

    audit.record({
      action: "event.create",
      resourceId: event.id,
      metadata: body,
    });

    return event;
  }

  @Put(":eventId")
  @RequiresCanvasAdmin()
  @ApiOperation({ summary: "Rename an event (admin)" })
  @ZodResponse({ type: BlurpleEventResponseDto })
  async editEvent(
    @Param() params: EventIdParamsDto,
    @Body() body: EditEventBodyDto,
    @Audit() audit: Audit,
  ) {
    const event = await this.eventService.editEvent(params.eventId, body.name);

    audit.record({
      action: "event.update",
      resourceId: event.id,
      metadata: body,
    });

    return event;
  }
}
