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
