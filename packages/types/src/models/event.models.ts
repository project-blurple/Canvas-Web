import z from "zod";

export const EventIdParamModel = z.object({
  eventId: z.coerce.number().int().positive(),
});

export const EditEventBodyModel = z.object({
  name: z.string().min(1).optional(),
});

export const CreateEventBodyModel = z.object({
  name: z.string().min(1),
  id: z.number().int().nonnegative(),
});
