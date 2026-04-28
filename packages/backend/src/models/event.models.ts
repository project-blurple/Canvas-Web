import type { BlurpleEvent } from "@blurple-canvas-web/types";
import z from "zod";
import { BadRequestError } from "@/errors";

const EventIdParamModel = z.object({
  eventId: z.coerce.number().int().positive(),
});

export interface EventIdParam {
  eventId: string;
}

export async function parseEventId(
  params: EventIdParam,
): Promise<BlurpleEvent["id"]> {
  const result = await EventIdParamModel.safeParseAsync(params);
  if (!result.success) {
    throw new BadRequestError(
      `${params.eventId} is not a valid event ID`,
      result.error.issues,
    );
  }

  return result.data.eventId;
}

export const EditEventBodyModel = z.object({
  name: z.string().min(1).optional(),
});

export const CreateEventBodyModel = z.object({
  name: z.string().min(1),
  id: z.number().int().nonnegative(),
});
