import {
  AuditLogPageSchema,
  AuditLogQueryModel,
} from "@blurple-canvas-web/types";
import { Controller, Get, Query } from "@nestjs/common";
import { ApiOperation } from "@nestjs/swagger";
import { createZodDto, ZodResponse } from "nestjs-zod";

import { RequiresCanvasAdmin } from "@/auth/require-auth.decorator";
import { AuditService } from "./audit.service";

class AuditLogQueryDto extends createZodDto(AuditLogQueryModel) {}

class AuditLogPageResponseDto extends createZodDto(AuditLogPageSchema) {}

@Controller("audit-log")
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @RequiresCanvasAdmin()
  @ApiOperation({
    summary: "Keyset-paginated audit log with actor/action/resource filters",
  })
  @ZodResponse({ type: AuditLogPageResponseDto })
  async getAuditLog(@Query() query: AuditLogQueryDto) {
    return await this.auditService.getAuditLog({
      actorId: query.actorId,
      action: query.action,
      resourceType: query.resourceType,
      resourceId: query.resourceId,
      from: query.from,
      to: query.to,
      limit: query.limit,
      cursor: query.cursor,
    });
  }
}
