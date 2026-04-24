import {
  BlurpleEvent,
  PaletteColor,
  PixelColor,
} from "@blurple-canvas-web/types";

import { prisma } from "@/client";
import { getCurrentEvent } from "./eventService";

/**
 * Retrieves the palette for the current event defined in the database.
 *
 * @returns The palette for the current event
 */
export async function getCurrentEventPalette(
  allColors = false,
): Promise<PaletteColor[]> {
  const currentEvent = await getCurrentEvent();
  return await getEventPalette(currentEvent.id, allColors);
}

/**
 * Retrieves the palette for an event. This includes all global colors and the partner colors for
 * the specific event. If there is not event with the given ID, only the global colors will be
 * returned.
 *
 * @param eventId The ID of the event to get the palette for
 * @returns The palette for the event
 */
export async function getEventPalette(
  eventId: number,
  allColors = false,
): Promise<PaletteColor[]> {
  const where =
    // If allColors is true, we don't need to filter the colors at all
    allColors ? undefined : (
      {
        OR: [
          { global: true },
          { participations: { some: { event_id: eventId } } },
        ],
      }
    );

  const eventPalette = await prisma.color.findMany({
    select: {
      id: true,
      code: true,
      global: true,
      name: true,
      rgba: true,
      participations: {
        select: {
          guild: {
            select: { invite: true, discord_guild_record: true, id: true },
          }, // Include the guild invite
        },
        // Only include the participation for the event we're looking at. This way the only element
        // in the participations array will be the one for the event we're looking at.
        where: {
          event_id: eventId,
        },
      },
    },
    // Filter the colours to only include global colours or colours that are part of the event
    where,
  });

  return eventPalette.map((color) => ({
    id: color.id,
    code: color.code,
    name: color.name,
    rgba: color.rgba as PixelColor,
    global: color.global,
    // We don't need to worry about the size of participations because JS doesn't throw index out
    // of bounds errors, instead it just returns undefined.
    invite: color.participations[0]?.guild?.invite ?? null,
    guildName:
      color.participations[0]?.guild?.discord_guild_record?.name ?? null,
    guildId: color.participations[0]?.guild?.id.toString() ?? null,
  }));
}

interface CreateColorParams {
  code: string;
  name: string;
  rgba: PixelColor;
  global: boolean;
}

export async function createColor({
  code,
  name,
  rgba,
  global,
}: CreateColorParams) {
  const color = await prisma.color.create({
    data: {
      code: code,
      name: name,
      rgba: rgba,
      global: global,
    },
  });

  return color;
}

interface EditColorParams {
  colorId: PaletteColor["id"];
  code: string;
  name: string;
  rgba: PixelColor;
  global: boolean;
}

export async function editColor({
  colorId,
  code,
  name,
  rgba,
  global,
}: EditColorParams) {
  const color = await prisma.color.update({
    where: {
      id: colorId,
    },
    data: {
      code: code,
      name: name,
      rgba: rgba,
      global: global,
    },
  });

  return color;
}

export async function deleteColor(colorId: PaletteColor["id"]) {
  await prisma.color.delete({
    where: {
      id: colorId,
    },
  });
}

interface AssignColorToEventParams {
  colorId: PaletteColor["id"];
  eventId: BlurpleEvent["id"];
  guildId: bigint;
}

export async function assignColorToEvent({
  colorId,
  eventId,
  guildId,
}: AssignColorToEventParams) {
  // Check if the color is already assigned to the event
  const existingParticipation = await prisma.participation.findFirst({
    where: {
      color_id: colorId,
      event_id: eventId,
    },
  });

  if (existingParticipation) {
    throw new Error(
      `Color with ID ${colorId} is already assigned to event with ID ${eventId}`,
    );
  }

  await prisma.participation.create({
    data: {
      color_id: colorId,
      event_id: eventId,
      guild_id: guildId,
    },
  });
}

interface UnassignColorFromEventParams {
  eventId: BlurpleEvent["id"];
  guildId: bigint;
}

export async function unassignColorFromEvent({
  eventId,
  guildId,
}: UnassignColorFromEventParams) {
  await prisma.participation.delete({
    where: {
      guild_id_event_id: {
        guild_id: guildId,
        event_id: eventId,
      },
    },
  });
}
