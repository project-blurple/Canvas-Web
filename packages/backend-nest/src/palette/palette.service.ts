import type {
  BlurpleEvent,
  PaletteColor,
  PaletteColorSummary,
  PixelColor,
} from "@blurple-canvas-web/types";
import { Injectable } from "@nestjs/common";

import { PrismaService } from "@/common/database/prisma.service";
import { ConflictError } from "@/common/errors/conflict.error";
import { EventService } from "@/event/event.service";

interface ColorSummary {
  id: number;
  code: string;
  name: string;
  rgba: number[];
  global: boolean;
}

export interface CreateColorParams {
  code: string;
  name: string;
  rgba: PixelColor;
  global: boolean;
}

export interface EditColorParams {
  colorId: PaletteColor["id"];
  data: CreateColorParams;
}

export interface AssignColorToEventParams {
  colorId: PaletteColor["id"];
  eventId: BlurpleEvent["id"];
  guildId: bigint;
}

export interface UnassignColorFromEventParams {
  eventId: BlurpleEvent["id"];
  guildId: bigint;
}

@Injectable()
export class PaletteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventService: EventService,
  ) {}

  /** Maps a colour row to its summary DTO. Shared with the statistics domain. */
  static toPaletteColorSummary(color: ColorSummary): PaletteColorSummary {
    return {
      id: color.id,
      code: color.code,
      name: color.name,
      rgba: color.rgba as PixelColor,
      global: color.global,
    };
  }

  /** Retrieves the palette for the current event defined in the database. */
  async getCurrentEventPalette(allColors = false): Promise<PaletteColor[]> {
    const currentEvent = await this.eventService.getCurrentEvent();
    return await this.getEventPalette(currentEvent.id, allColors);
  }

  /**
   * Retrieves the palette for an event: all global colours plus the partner
   * colours for that event. With no event match, only global colours return.
   */
  async getEventPalette(
    eventId: number,
    allColors = false,
  ): Promise<PaletteColor[]> {
    const where =
      allColors ? undefined : (
        {
          OR: [{ global: true }, { participations: { some: { eventId } } }],
        }
      );

    const eventPalette = await this.prisma.color.findMany({
      select: {
        id: true,
        code: true,
        global: true,
        name: true,
        rgba: true,
        participations: {
          select: {
            guild: {
              select: { invite: true, discordGuildRecord: true, id: true },
            },
          },
          // Scope the nested relation to this event so participations holds at
          // most the single row for the event we're looking at.
          where: {
            eventId,
          },
        },
      },
      where,
    });

    return eventPalette.map((color) => ({
      id: color.id,
      code: color.code,
      name: color.name,
      rgba: color.rgba as PixelColor,
      global: color.global,
      // We don't need to worry about the size of participations because JS
      // doesn't throw index out of bounds errors, it just returns undefined.
      invite: color.participations[0]?.guild?.invite ?? null,
      guildName:
        color.participations[0]?.guild?.discordGuildRecord?.name ?? null,
      guildId: color.participations[0]?.guild?.id.toString() ?? null,
    }));
  }

  async createColor(params: CreateColorParams) {
    return await this.prisma.color.create({
      data: {
        code: params.code,
        name: params.name,
        rgba: params.rgba,
        global: params.global,
      },
    });
  }

  async editColor({ colorId, data }: EditColorParams) {
    return await this.prisma.color.update({
      where: {
        id: colorId,
      },
      data,
    });
  }

  async deleteColor(colorId: PaletteColor["id"]) {
    await this.prisma.color.delete({
      where: {
        id: colorId,
      },
    });
  }

  async assignColorToEvent({
    colorId,
    eventId,
    guildId,
  }: AssignColorToEventParams) {
    const existingParticipation = await this.prisma.participation.findFirst({
      where: {
        colorId,
        eventId,
      },
    });

    if (existingParticipation) {
      throw new ConflictError(
        `Color with ID ${colorId} is already assigned to event with ID ${eventId}`,
      );
    }

    await this.prisma.participation.create({
      data: {
        colorId,
        eventId,
        guildId,
      },
    });
  }

  async unassignColorFromEvent({
    eventId,
    guildId,
  }: UnassignColorFromEventParams) {
    await this.prisma.participation.delete({
      where: {
        guildId_eventId: {
          guildId,
          eventId,
        },
      },
    });
  }
}
