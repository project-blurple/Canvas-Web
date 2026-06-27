import {
  type BlurpleEvent,
  type CanvasInfo,
  CanvasPlaceState,
  type CanvasSummary,
} from "@blurple-canvas-web/types";
import { Inject, Injectable, Logger } from "@nestjs/common";

import type { Canvas } from "@/common/database/core/prisma.client";
import { PrismaService } from "@/common/database/core/prisma.service";
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
  placeState?: CanvasPlaceState;
  allColorsGlobal?: boolean;
  cooldownDuration?: number;
}

export interface PasteArea {
  topLeftX: number;
  topLeftY: number;
  bottomRightX: number;
  bottomRightY: number;
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
        "canvas.placeState",
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
        "canvas.placeState",
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
      placeState: canvas.placeState as CanvasPlaceState,
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
        placeState: true,
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
  }: CreateCanvasParams): Promise<Canvas> {
    const currentEventId = await this.getCurrentEventId();

    const canvas = await this.prisma.canvas.create({
      data: {
        name,
        width,
        height,
        eventId: currentEventId,
        startCoordinates,
        placeState: CanvasPlaceState.NoOne,
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
    placeState,
    allColorsGlobal,
    cooldownDuration,
  }: EditCanvasParams): Promise<Canvas> {
    const canvas = await this.prisma.canvas.update({
      where: {
        id: canvasId,
      },
      data: {
        name,
        placeState: placeState,
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
  /**
   * Bounding box of a paste, or null for an empty paste. Computed in a single
   * pass: spreading `data` into Math.min/Math.max overflows the call stack for
   * large pastes.
   */
  static computePasteArea(
    data: readonly [number, number, number][],
  ): PasteArea | null {
    if (data.length === 0) {
      return null;
    }

    let topLeftX = Infinity;
    let topLeftY = Infinity;
    let bottomRightX = -Infinity;
    let bottomRightY = -Infinity;

    for (const [x, y] of data) {
      if (x < topLeftX) topLeftX = x;
      if (y < topLeftY) topLeftY = y;
      if (x > bottomRightX) bottomRightX = x;
      if (y > bottomRightY) bottomRightY = y;
    }

    return { topLeftX, topLeftY, bottomRightX, bottomRightY };
  }

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

    const area = CanvasService.computePasteArea(data);

    if (
      area &&
      (area.topLeftX < 0 ||
        area.topLeftY < 0 ||
        area.bottomRightX >= canvas.width ||
        area.bottomRightY >= canvas.height)
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

  /**
   * Whether the given canvas belongs to the current event. Used by the
   * moderator history-erase policy guard (admins bypass it via the force
   * endpoint).
   */
  async isCanvasInCurrentEvent(canvasId: number): Promise<boolean> {
    const canvas = await this.prisma.canvas.findUnique({
      where: { id: canvasId },
      select: { eventId: true },
    });

    if (!canvas) {
      throw new NotFoundError(`There is no canvas with ID ${canvasId}`);
    }

    const currentEventId = await this.getCurrentEventId();
    return canvas.eventId === currentEventId;
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
      Canvas,
      | "id"
      | "name"
      | "width"
      | "height"
      | "startCoordinates"
      | "placeState"
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
      placeState: canvas.placeState as CanvasPlaceState,
      eventId: canvas.eventId,
      webPlacingEnabled: this.placementCfg.webPlacingEnabled,
      allColorsGlobal: canvas.allColorsGlobal,
      cooldownDuration: canvas.cooldownLength,
    };
  }
}
