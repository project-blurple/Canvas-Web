import type {
  BlurpleEvent,
  CanvasInfo,
  CanvasSummary,
} from "@blurple-canvas-web/types";
import { Inject, Injectable, Logger } from "@nestjs/common";

import type { CanvasModel } from "@/common/database/generated/models";
import { PrismaService } from "@/common/database/prisma.service";
import { NotFoundError } from "@/common/errors/not-found.error";
import { UnprocessableError } from "@/common/errors/unprocessable.error";
import {
  type PlacementConfig,
  placementConfig,
} from "@/config/placement.config";
import { BroadcastService } from "@/realtime/broadcast.service";
import {
  type BulkPlaceEntry,
  PixelReconciliationService,
} from "./pixel-reconciliation.service";

export interface CreateCanvasParams {
  name: string;
  width: number;
  height: number;
  startCoordinates?: [number, number];
  allColorsGlobal?: boolean;
  cooldownDuration?: number;
}

export interface EditCanvasParams {
  canvasId: number;
  name?: string;
  isLocked?: boolean;
  allColorsGlobal?: boolean;
  cooldownDuration?: number;
}

@Injectable()
export class CanvasService {
  private readonly logger = new Logger(CanvasService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly broadcastService: BroadcastService,
    private readonly pixelReconciliationService: PixelReconciliationService,
    @Inject(placementConfig.KEY)
    private readonly placementCfg: PlacementConfig,
  ) {}

  /**
   * Retrieves canvas summary info for all canvases, sorted by last pixel
   * activity (most recent first).
   *
   * @param eventId If provided, only canvases for the specified event will be
   * returned
   */
  async getCanvases(
    eventId?: BlurpleEvent["id"],
  ): Promise<(CanvasSummary & { cooldownDuration: number | null })[]> {
    const canvases = await this.prisma.$kysely
      .selectFrom("canvas")
      .leftJoin("history", (join) =>
        join
          .onRef("history.canvasId", "=", "canvas.id")
          .on("history.erasedAt", "is", null),
      )
      .select((eb) => [
        "canvas.id",
        "canvas.name",
        "canvas.eventId",
        "canvas.locked",
        "canvas.width",
        "canvas.height",
        "canvas.cooldownLength",
        eb.fn.max("history.timestamp").as("lastPixelTimestamp"),
      ])
      .$if(eventId !== undefined, (qb) =>
        qb.where("canvas.eventId", "=", eventId as number),
      )
      .groupBy([
        "canvas.id",
        "canvas.name",
        "canvas.eventId",
        "canvas.locked",
        "canvas.width",
        "canvas.height",
      ])
      .orderBy("lastPixelTimestamp", (ob) => ob.desc().nullsLast())
      .orderBy("canvas.id", "desc")
      .execute();

    return canvases.map((canvas) => ({
      id: canvas.id,
      name: canvas.name,
      eventId: canvas.eventId,
      isLocked: canvas.locked,
      width: canvas.width,
      height: canvas.height,
      cooldownDuration: canvas.cooldownLength,
    }));
  }

  /**
   * Retrieves the canvas info of the default canvas ID defined in the
   * database.
   */
  async getCurrentCanvasInfo(): Promise<CanvasInfo> {
    return this.getCanvasInfo(await this.getDefaultCanvasId());
  }

  async getCanvasInfo(canvasId: number): Promise<CanvasInfo> {
    const canvas = await this.prisma.canvas.findFirst({
      select: {
        id: true,
        name: true,
        width: true,
        height: true,
        startCoordinates: true,
        locked: true,
        eventId: true,
        cooldownLength: true,
        allColorsGlobal: true,
      },
      where: {
        id: canvasId,
      },
    });

    if (!canvas) {
      throw new NotFoundError(`There is no canvas with ID ${canvasId}`);
    }

    return this.canvasToCanvasInfo(canvas);
  }

  /** The default canvas ID defined in the database's `info` singleton row. */
  async getDefaultCanvasId(): Promise<number> {
    const info = await this.prisma.info.findFirst({
      select: { defaultCanvasId: true },
    });

    // To get rid of the nullable type from info. This should never happen
    if (!info) {
      throw new Error("The info table is empty! 😱");
    }

    return info.defaultCanvasId;
  }

  /**
   * Gets the remaining cooldown time in milliseconds for the given user on
   * the given canvas, or `null` when there is no active cooldown.
   */
  async getUserCanvasCooldown(
    canvasId: number,
    userId: bigint,
  ): Promise<number | null> {
    const canvas = await this.prisma.canvas.findFirst({
      where: { id: canvasId },
      select: { id: true },
    });

    if (!canvas) {
      throw new NotFoundError(`There is no canvas with ID ${canvasId}`);
    }

    const cooldown = await this.prisma.cooldown.findFirst({
      where: {
        userId,
        canvasId,
      },
      select: { cooldownTime: true },
    });

    if (!cooldown?.cooldownTime) {
      return null;
    }

    const remaining = cooldown.cooldownTime.valueOf() - Date.now();
    return remaining > 0 ? remaining : null;
  }

  async createCanvas({
    name,
    width,
    height,
    startCoordinates = [1, 1],
    allColorsGlobal = false,
    cooldownDuration = 15,
  }: CreateCanvasParams): Promise<CanvasModel> {
    const currentEventId = await this.getCurrentEventId();

    const canvas = await this.prisma.canvas.create({
      data: {
        name,
        width,
        height,
        eventId: currentEventId,
        startCoordinates,
        locked: true,
        cooldownLength: cooldownDuration,
        allColorsGlobal,
      },
    });

    await this.createCanvasPixelEntries(canvas.id, width, height);

    this.broadcastService.broadcastCanvasInfo(this.canvasToCanvasInfo(canvas));

    return canvas;
  }

  async editCanvas({
    canvasId,
    name,
    isLocked,
    allColorsGlobal,
    cooldownDuration,
  }: EditCanvasParams): Promise<CanvasModel> {
    const canvas = await this.prisma.canvas.update({
      where: {
        id: canvasId,
      },
      data: {
        name,
        locked: isLocked,
        cooldownLength: cooldownDuration,
        allColorsGlobal,
      },
    });

    this.broadcastService.broadcastCanvasInfo(this.canvasToCanvasInfo(canvas));

    return canvas;
  }

  /**
   * Bulk-pastes `[x, y, colorId]` triples onto a canvas: validates the data
   * against the canvas bounds and the event palette, then writes the history
   * entries and reconciles the pixels.
   */
  async pasteCanvasData(
    canvasId: number,
    authorId: bigint,
    data: [number, number, number][],
  ): Promise<void> {
    const canvas = await this.prisma.canvas.findFirst({
      where: { id: canvasId },
    });

    if (!canvas) {
      throw new NotFoundError(`There is no canvas with ID ${canvasId}`);
    }

    if (!canvas.eventId) {
      throw new UnprocessableError(
        `Canvas with ID ${canvasId} is not associated with an event`,
      );
    }

    // The event palette: global colours plus the partner colours of the
    // canvas's event (same filter as the old `getEventPalette`).
    const colors = await this.prisma.color.findMany({
      select: { id: true },
      where: {
        OR: [
          { global: true },
          { participations: { some: { eventId: canvas.eventId } } },
        ],
      },
    });

    // ~~~ Validation ~~~

    const entries = data.map(
      ([x, y, colorId]): BulkPlaceEntry => ({
        x,
        y,
        colorId,
      }),
    );

    const lowestX = entries.reduce(
      (min, entry) => Math.min(min, entry.x),
      entries[0].x,
    );
    const lowestY = entries.reduce(
      (min, entry) => Math.min(min, entry.y),
      entries[0].y,
    );
    const highestX = entries.reduce(
      (max, entry) => Math.max(max, entry.x),
      entries[0].x,
    );
    const highestY = entries.reduce(
      (max, entry) => Math.max(max, entry.y),
      entries[0].y,
    );

    if (
      lowestX < 0 ||
      lowestY < 0 ||
      highestX >= canvas.width ||
      highestY >= canvas.height
    ) {
      throw new Error(
        `Data contains coordinates that are out of bounds for canvas with ID ${canvasId}`,
      );
    }

    const uniqueColors = Array.from(
      new Set(entries.map(({ colorId }) => colorId)),
    );
    const invalidColorIds = uniqueColors.filter(
      (colorId) => !colors.some((color) => color.id === colorId),
    );

    if (invalidColorIds.length > 0) {
      const formatter = new Intl.ListFormat();
      throw new Error(
        `Data contains color IDs that are not in the event palette: ${formatter.format(invalidColorIds.map((id) => id.toString()))}`,
      );
    }

    // ~~~ Execution ~~~

    await this.prisma.user.upsert({
      where: { id: authorId },
      create: { id: authorId },
      update: {},
    });

    await this.pixelReconciliationService.createBulkPlaceEntries({
      canvasId,
      userId: authorId,
      entries,
    });
  }

  private async createCanvasPixelEntries(
    canvasId: number,
    width: number,
    height: number,
  ): Promise<void> {
    const pixelsData = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        pixelsData.push({
          canvasId,
          x,
          y,
          colorId: 1, // Defaults to blank color (ID #1)
        });
      }
    }

    this.logger.log(
      `Creating ${pixelsData.length} pixel entries for canvas ${canvasId}`,
    );

    // Insert pixels in batches to avoid overwhelming the database
    const batchSize = 10_000;
    for (let i = 0; i < pixelsData.length; i += batchSize) {
      const batch = pixelsData.slice(i, i + batchSize);
      this.logger.log(
        `Inserting pixels ${i} to ${i + batch.length} for canvas ${canvasId}`,
      );
      await this.prisma.pixel.createMany({
        data: batch,
      });
    }
  }

  private async getCurrentEventId(): Promise<number> {
    const info = await this.prisma.info.findFirst({
      select: {
        currentEvent: { select: { id: true } },
      },
    });

    if (!info) {
      throw new Error("The info table is empty! 😱");
    }

    if (!info.currentEvent) {
      // The `current_event_id` value is not a valid ID in the `event` table
      throw new NotFoundError("Can’t find the current event");
    }

    return info.currentEvent.id;
  }

  private canvasToCanvasInfo(
    canvas: Pick<
      CanvasModel,
      | "id"
      | "name"
      | "width"
      | "height"
      | "startCoordinates"
      | "locked"
      | "eventId"
      | "cooldownLength"
      | "allColorsGlobal"
    >,
  ): CanvasInfo {
    return {
      id: canvas.id,
      name: canvas.name,
      width: canvas.width,
      height: canvas.height,
      startCoordinates: [
        canvas.startCoordinates[0],
        canvas.startCoordinates[1],
      ],
      isLocked: canvas.locked,
      eventId: canvas.eventId,
      webPlacingEnabled: this.placementCfg.webPlacingEnabled,
      allColorsGlobal: canvas.allColorsGlobal,
      cooldownDuration: canvas.cooldownLength,
    };
  }
}
