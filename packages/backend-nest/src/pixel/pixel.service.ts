import {
  CanvasPlaceState,
  type PaletteColor,
  type PixelColor,
  type Point,
} from "@blurple-canvas-web/types";
import { Inject, Injectable } from "@nestjs/common";

import { BlocklistService } from "@/blocklist/blocklist.service";
import { CanvasCacheService } from "@/canvas/canvas-cache.service";
import type { ColorModel } from "@/common/database/generated/models";
import { PrismaService } from "@/common/database/prisma.service";
import { BadRequestError } from "@/common/errors/bad-request.error";
import { ForbiddenError } from "@/common/errors/forbidden.error";
import { NotFoundError } from "@/common/errors/not-found.error";
import {
  type PlacementConfig,
  placementConfig,
} from "@/config/placement.config";
import { BroadcastService } from "@/realtime/broadcast.service";

@Injectable()
export class PixelService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly broadcastService: BroadcastService,
    private readonly canvasCacheService: CanvasCacheService,
    private readonly blocklistService: BlocklistService,
    @Inject(placementConfig.KEY)
    private readonly placementCfg: PlacementConfig,
  ) {}

  /**
   * Ensures that the given pixel coordinates are within the bounds of the
   * canvas and the canvas exists
   *
   * @param canvasId - The ID of the canvas
   * @param coordinates - The coordinates of the pixel
   * @param honorLocked - True will return an error if the canvas is locked or soft-locked
   * @param userId - Required when honorLocked is true and the canvas may be soft-locked
   */
  async validatePixel(
    canvasId: number,
    coordinates: Point,
    honorLocked: boolean,
    userId?: bigint,
  ): Promise<void> {
    const canvas = await this.prisma.canvas.findFirst({
      where: {
        id: canvasId,
      },
    });

    if (!canvas) {
      throw new NotFoundError(`There is no canvas with ID ${canvasId}`);
    }

    if (coordinates.x < 0 || coordinates.x >= canvas.width) {
      throw new BadRequestError(
        `X coordinate ${coordinates.x} is out of bounds for canvas ${canvasId}`,
      );
    }

    if (coordinates.y < 0 || coordinates.y >= canvas.height) {
      throw new BadRequestError(
        `Y coordinate ${coordinates.y} is out of bounds for canvas ${canvasId}`,
      );
    }

    if (honorLocked && canvas.placeState === CanvasPlaceState.NoOne) {
      throw new ForbiddenError(`Canvas with ID ${canvasId} is locked`);
    }

    if (
      honorLocked &&
      canvas.placeState === CanvasPlaceState.NoNewUsers &&
      userId !== undefined
    ) {
      const existingHistory = await this.prisma.history.findFirst({
        where: {
          canvasId,
          userId,
          erasedAt: null,
        },
        select: { id: true },
      });

      if (!existingHistory) {
        throw new ForbiddenError(
          "This canvas is soft-locked. Only users with existing placements may place pixels.",
        );
      }
    }
  }

  /**
   * Ensures that the given color exists in the DB and it is allowed to be
   * used in the given canvas.
   *
   * Partnered (non-global) colors are gated by two conditions, either of
   * which is sufficient:
   *
   * 1. The canvas has `allColorsGlobal` enabled (admin override).
   * 2. The color is registered as a participation in the canvas's event and
   *    the user is a member of that participation's guild (verified via the
   *    supplied `userGuildIds` set, which the caller is expected to source
   *    from the cached Discord guild flags).
   *
   * @param colorId - The ID of the color
   * @param canvasId - The ID of the canvas the color is being used on
   * @param userGuildIds - Discord guild IDs the user is a member of (as decimal strings)
   * @returns The corresponding color object
   */
  async validateColor(
    colorId: number,
    canvasId: number,
    userGuildIds: ReadonlySet<string>,
  ): Promise<ColorModel & { rgba: PixelColor }> {
    const [color, canvas] = await Promise.all([
      this.prisma.color.findFirst({
        where: {
          id: colorId,
        },
      }) as Promise<(ColorModel & { rgba: PixelColor }) | null>,
      this.prisma.canvas.findFirst({
        where: { id: canvasId },
        select: { allColorsGlobal: true, eventId: true },
      }),
    ]);

    if (!color) {
      throw new NotFoundError(`There is no color with ID ${colorId}`);
    }

    if (!color.global && !canvas?.allColorsGlobal) {
      if (canvas?.eventId == null) {
        throw new ForbiddenError(
          `Partnered color with ID ${colorId} cannot be placed on this canvas`,
        );
      }

      const participation = await this.prisma.participation.findFirst({
        where: { colorId, eventId: canvas.eventId },
        select: { guildId: true },
      });

      if (!participation) {
        throw new ForbiddenError(
          `Partnered color with ID ${colorId} is not part of this canvas's event`,
        );
      }

      if (!userGuildIds.has(participation.guildId.toString())) {
        throw new ForbiddenError(
          `You must be a member of the partner server to use color with ID ${colorId}`,
        );
      }
    }

    return color;
  }

  /** Ensures that the given user is not blocklisted from placing pixels */
  async validateUser(userId: bigint): Promise<void> {
    if (await this.blocklistService.userIsBlocklisted(userId)) {
      throw new ForbiddenError("User is blocklisted");
    }
  }

  /**
   * Gets the current and future (after pixel placement) cooldown time for the
   * given canvas.
   *
   * @param canvasId - The ID of the canvas
   * @param userId - The ID of the user
   * @param placementTime - The time that the pixel will be placed
   *
   * @remarks
   *
   * Some canvases may not have a placement cooldown timer set,
   * which means that returned values can be null and need to be handled
   *
   * @returns The current and future cooldown time
   */
  async getCooldown(
    canvasId: number,
    userId: bigint,
    placementTime: Date,
  ): Promise<{ currentCooldown: Date | null; futureCooldown: Date | null }> {
    const canvas = await this.prisma.canvas.findFirst({
      where: {
        id: canvasId,
      },
    });
    const cooldown = await this.prisma.cooldown.findFirst({
      where: {
        userId,
        canvasId,
      },
    });

    // Don't need to return cooldown if canvas itself doesn't have cooldown
    if (!canvas?.cooldownLength) {
      return { currentCooldown: null, futureCooldown: null };
    }

    const futureCooldown = new Date(
      placementTime.valueOf() + canvas.cooldownLength * 1000,
    );

    // Return early if no cooldown exists
    if (!cooldown?.cooldownTime) {
      return { currentCooldown: null, futureCooldown };
    }

    const currentCooldown = cooldown.cooldownTime;

    if (placementTime <= currentCooldown) {
      throw new ForbiddenError("Pixel placement is on cooldown");
    }
    return { currentCooldown, futureCooldown };
  }

  /**
   * Places a pixel in the given canvas and updates the cooldown and history
   * tables. This function also applies optimistic locking on the cooldown
   * table: the conditional upsert only advances the cooldown when
   * there is no active one, so of N concurrent placements within a cooldown
   * window exactly one wins and the rest abort without writing a pixel or
   * history row.
   *
   * @param canvasId - The ID of the canvas
   * @param userId - The ID of the user
   * @param coordinates - The coordinates of the pixel
   * @param color - The color of the pixel
   */
  async placePixel(
    canvasId: number,
    userId: bigint,
    coordinates: Point,
    color: Pick<PaletteColor, "id" | "rgba">,
  ): Promise<{ futureCooldown: Date | null }> {
    const placementTime = new Date();
    const { futureCooldown } = await this.getCooldown(
      canvasId,
      userId,
      placementTime,
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.user.upsert({
        where: { id: userId },
        create: { id: userId },
        update: {},
      });

      // only update the cooldown table if the canvas has a cooldown
      if (futureCooldown) {
        const row = await tx.$kysely
          .insertInto("cooldown")
          .values({
            userId,
            canvasId,
            cooldownTime: futureCooldown,
          })
          .onConflict((oc) =>
            oc
              .columns(["userId", "canvasId"])
              .doUpdateSet({
                cooldownTime: futureCooldown,
              })
              .where((eb) =>
                eb.or([
                  eb("cooldown.cooldownTime", "is", null),
                  eb("cooldown.cooldownTime", "<=", placementTime),
                ]),
              ),
          )
          .returning("userId")
          .executeTakeFirst();

        if (!row) {
          throw new ForbiddenError("Pixel placement is on cooldown");
        }
      }
      await tx.pixel.upsert({
        where: {
          canvasId_x_y: {
            canvasId,
            ...coordinates,
          },
        },
        create: {
          canvasId,
          ...coordinates,
          colorId: color.id,
        },
        update: {
          colorId: color.id,
        },
      });
      await tx.history.create({
        data: {
          canvasId,
          userId,
          x: coordinates.x,
          y: coordinates.y,
          colorId: color.id,
          timestamp: placementTime,
          guildId: this.placementCfg.webGuildId,
        },
      });
    });

    this.broadcastService.broadcastPixel(canvasId, {
      x: coordinates.x,
      y: coordinates.y,
      rgba: color.rgba,
    });

    // Only update the cache if the transaction is successful
    this.canvasCacheService.updateCachedCanvasPixel(
      canvasId,
      coordinates,
      color.rgba,
    );
    return { futureCooldown };
  }
}
