import type { PixelColor, PlacePixelSocket } from "@blurple-canvas-web/types";
import { Injectable } from "@nestjs/common";

import { PrismaService } from "@/common/database/core/prisma.service";

@Injectable()
export class PixelResyncService {
  constructor(private readonly prisma: PrismaService) {}

  async getMissedPixels(
    canvasId: number,
    pixelTimestamp: string,
  ): Promise<PlacePixelSocket.Payload[]> {
    const pixels = await this.prisma.history.findMany({
      select: {
        x: true,
        y: true,
        color: { select: { rgba: true } },
      },
      where: {
        erasedAt: null,
        canvasId,
        timestamp: {
          // Greater than or equal as multiple pixels may have been placed at
          // the same time and we don't know which ones the client received.
          gte: pixelTimestamp,
        },
      },
    });

    return pixels.map((pixel) => ({
      x: pixel.x,
      y: pixel.y,
      rgba: pixel.color.rgba as PixelColor,
    }));
  }
}
