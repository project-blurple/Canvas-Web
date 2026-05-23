import z from "zod";

export const BlurpleEventSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  isCurrentEvent: z.boolean(),
});

export type BlurpleEvent = z.infer<typeof BlurpleEventSchema>;
