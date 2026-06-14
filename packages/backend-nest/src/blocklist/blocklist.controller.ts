import {
  BlocklistBodyModel,
  BlocklistDeleteBodyModel,
  BlocklistEntrySchema,
} from "@blurple-canvas-web/types";
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Put,
} from "@nestjs/common";
import { ApiNoContentResponse, ApiOperation } from "@nestjs/swagger";
import { createZodDto, ZodResponse } from "nestjs-zod";

import { RequiresCanvasModerator } from "@/auth/require-auth.decorator";
import { BlocklistService } from "./blocklist.service";

class BlocklistBodyDto extends createZodDto(BlocklistBodyModel) {}

class BlocklistDeleteBodyDto extends createZodDto(BlocklistDeleteBodyModel) {}

class BlocklistEntryResponseDto extends createZodDto(BlocklistEntrySchema) {}

@Controller("blocklist")
export class BlocklistController {
  constructor(private readonly blocklistService: BlocklistService) {}

  @Get()
  @RequiresCanvasModerator()
  @ApiOperation({ summary: "List every blocklisted user" })
  @ZodResponse({ type: [BlocklistEntryResponseDto] })
  async getBlocklist() {
    return await this.blocklistService.getBlocklist();
  }

  @Put()
  @RequiresCanvasModerator()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Add one or more users to the blocklist" })
  async addToBlocklist(@Body() body: BlocklistBodyDto) {
    const addedUsers = await this.blocklistService.addUsersToBlocklist(body);

    // todo: audit log

    return addedUsers;
  }

  @Delete()
  @RequiresCanvasModerator()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      "Remove users from the blocklist, optionally restoring their history",
  })
  @ApiNoContentResponse({ description: "Users removed from the blocklist" })
  async removeFromBlocklist(
    @Body() body: BlocklistDeleteBodyDto,
  ): Promise<void> {
    const { userIds, shouldRestoreHistoryForCanvasId } = body;

    await this.blocklistService.removeUsersFromBlocklist(
      userIds,
      shouldRestoreHistoryForCanvasId ?? [],
    );

    // todo: audit log
  }
}
