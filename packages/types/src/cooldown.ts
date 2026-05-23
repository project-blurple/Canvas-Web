import z from "zod";

export const CooldownSchema = z.object({
  cooldownEndTime: z.number().optional(),
});

export type Cooldown = z.infer<typeof CooldownSchema>;
