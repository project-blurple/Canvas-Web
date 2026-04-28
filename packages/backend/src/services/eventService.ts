import type { BlurpleEvent } from "@blurple-canvas-web/types";
import { prisma } from "@/client";
import { NotFoundError } from "@/errors";

export async function getEventById(
  eventId: BlurpleEvent["id"],
): Promise<BlurpleEvent> {
  const event = await prisma.event.findFirst({
    where: {
      id: eventId,
    },
  });

  if (!event) {
    throw new NotFoundError(`There is no event with ID ${eventId}`);
  }

  return event;
}

export async function getCurrentEvent(): Promise<BlurpleEvent> {
  const info = await prisma.info.findFirst({
    select: {
      current_event: true,
    },
  });

  if (!info) {
    throw new Error("The info table is empty! 😱");
  }

  const { current_event: currentEvent } = info;

  if (!currentEvent) {
    // The `current_event_id` value is not a valid ID in the `event` table
    throw new NotFoundError("Can’t find the current event");
  }

  return currentEvent;
}

export async function createEvent(
  name: string,
  id: number,
): Promise<BlurpleEvent> {
  const existingEvent = await getEventById(id).catch(() => null);
  if (existingEvent) {
    throw new NotFoundError(`An event with ID ${id} already exists`);
  }

  // Gotta provide your own ID ¯\_(ツ)_/¯
  const event = await prisma.event.create({
    data: {
      name,
      id,
    },
  });
  return event;
}

export async function editEvent(
  eventId: BlurpleEvent["id"],
  newName?: string,
): Promise<BlurpleEvent> {
  const event = await prisma.event.update({
    where: {
      id: eventId,
    },
    data: {
      name: newName,
    },
  });
  return event;
}
