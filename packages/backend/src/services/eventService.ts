import type { BlurpleEvent } from "@blurple-canvas-web/types";
import { Prisma, prisma } from "@/client";
import { NotFoundError } from "@/errors";
import ConflictError from "@/errors/ConflictError";
import { PrismaErrorCode } from "@/utils";

async function assignIsCurrentEvent(
  event: Omit<BlurpleEvent, "isCurrentEvent">,
): Promise<BlurpleEvent> {
  const info = await prisma.info.findFirst({
    select: {
      current_event_id: true,
    },
  });

  return {
    ...event,
    isCurrentEvent: info?.current_event_id === event.id,
  };
}

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

  return await assignIsCurrentEvent(event);
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

  return await assignIsCurrentEvent(currentEvent);
}

export async function createEvent(
  name: string,
  id: number,
): Promise<BlurpleEvent> {
  try {
    const event = await prisma.event.create({
      data: { name, id },
    });
    return await assignIsCurrentEvent(event);
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === PrismaErrorCode.UniqueConstraintViolation
    ) {
      throw new ConflictError(`An event with ID ${id} already exists`);
    }
    throw err;
  }
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
  return await assignIsCurrentEvent(event);
}
