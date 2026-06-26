import {
  NoticeBodyModel,
  NoticeIdParamModel,
  NoticeSchema,
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
} from "@nestjs/common";
import { ApiNoContentResponse, ApiOperation } from "@nestjs/swagger";
import { createZodDto, ZodResponse } from "nestjs-zod";

import { Audit } from "@/audit/audit.decorator";
import { RequiresCanvasAdmin } from "@/auth/require-auth.decorator";
import { BroadcastService } from "@/realtime/broadcast.service";
import { NoticeService } from "./notice.service";

class NoticeIdParamsDto extends createZodDto(NoticeIdParamModel) {}

class NoticeBodyDto extends createZodDto(NoticeBodyModel) {}

class NoticeResponseDto extends createZodDto(NoticeSchema) {}

@Controller("notice")
export class NoticeController {
  constructor(
    private readonly noticeService: NoticeService,
    private readonly broadcastService: BroadcastService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Active notices (priority then recency)" })
  @ZodResponse({ type: [NoticeResponseDto] })
  async getActiveNotices() {
    return await this.noticeService.getNotices(true);
  }

  @Get("all")
  @RequiresCanvasAdmin()
  @ApiOperation({ summary: "All notices, active first (admin)" })
  @ZodResponse({ type: [NoticeResponseDto] })
  async getAllNotices() {
    return await this.noticeService.getNotices(false);
  }

  @Post()
  @RequiresCanvasAdmin()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a notice (admin)" })
  @ZodResponse({ status: HttpStatus.CREATED, type: NoticeResponseDto })
  async createNotice(@Body() body: NoticeBodyDto, @Audit() audit: Audit) {
    const notice = await this.noticeService.createNotice(body);

    audit.record({
      action: "notice.create",
      resourceId: notice.id,
      metadata: body,
    });

    this.broadcastService.broadcastNoticeUpdate();

    return notice;
  }

  @Put(":noticeId")
  @RequiresCanvasAdmin()
  @ApiOperation({ summary: "Update a notice (admin)" })
  @ZodResponse({ type: NoticeResponseDto })
  async updateNotice(
    @Param() params: NoticeIdParamsDto,
    @Body() body: NoticeBodyDto,
    @Audit() audit: Audit,
  ) {
    const notice = await this.noticeService.updateNotice({
      noticeId: params.noticeId,
      data: body,
    });

    audit.record({
      action: "notice.update",
      resourceId: notice.id,
      metadata: body,
    });

    this.broadcastService.broadcastNoticeUpdate();

    return notice;
  }

  @Delete(":noticeId")
  @RequiresCanvasAdmin()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete a notice (admin)" })
  @ApiNoContentResponse({ description: "Notice deleted" })
  async deleteNotice(
    @Param() params: NoticeIdParamsDto,
    @Audit() audit: Audit,
  ): Promise<void> {
    await this.noticeService.deleteNotice(params.noticeId);

    audit.record({
      action: "notice.delete",
      resourceId: params.noticeId,
    });

    this.broadcastService.broadcastNoticeUpdate();
  }
}
