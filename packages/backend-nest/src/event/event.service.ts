import type { BlurpleEvent } from "@blurple-canvas-web/types";
import { Injectable } from "@nestjs/common";

import { Prisma } from "@/common/database/prisma.client";
import { PrismaService } from "@/common/database/prisma.service";
import { ConflictError } from "@/common/errors/conflict.error";
import { NotFoundError } from "@/common/errors/not-found.error";

@Injectable()
export class EventService {
  constructor(private readonly prisma: PrismaService) {}

  async getEventById(eventId: BlurpleEvent["id"]): Promise<BlurpleEvent> {
    const event = await this.prisma.event.findFirst({
      where: {
        id: eventId,
      },
    });

    if (!event) {
      throw new NotFoundError(`There is no event with ID ${eventId}`);
    }

    return await this.assignIsCurrentEvent(event);
  }

  async getCurrentEvent(): Promise<BlurpleEvent> {
    const info = await this.prisma.info.findFirst({
      select: {
        currentEvent: true,
      },
    });

    if (!info) {
      throw new Error("The info table is empty! 😱");
    }

    const { currentEvent } = info;

    if (!currentEvent) {
      // The `current_event_id` value is not a valid ID in the `event` table
      throw new NotFoundError("Can’t find the current event");
    }

    return await this.assignIsCurrentEvent(currentEvent);
  }

  async createEvent(name: string, id: number): Promise<BlurpleEvent> {
    try {
      const event = await this.prisma.event.create({
        data: { name, id },
      });
      return await this.assignIsCurrentEvent(event);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        throw new ConflictError(`An event with ID ${id} already exists`);
      }
      throw err;
    }
  }

  async editEvent(
    eventId: BlurpleEvent["id"],
    newName?: string,
  ): Promise<BlurpleEvent> {
    const event = await this.prisma.event.update({
      where: {
        id: eventId,
      },
      data: {
        name: newName,
      },
    });

    return await this.assignIsCurrentEvent(event);
  }

  private async assignIsCurrentEvent(
    event: Omit<BlurpleEvent, "isCurrentEvent">,
  ): Promise<BlurpleEvent> {
    const info = await this.prisma.info.findFirst({
      select: {
        currentEventId: true,
      },
    });

    return {
      ...event,
      isCurrentEvent: info?.currentEventId === event.id,
    };
  }
}
