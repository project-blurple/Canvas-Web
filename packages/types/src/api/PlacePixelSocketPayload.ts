import z from "zod";
import { PixelColorSchema } from "../palette.js";

export const PayloadSchema = z.object({
  x: z.number(),
  y: z.number(),
  rgba: PixelColorSchema,
});

export type Payload = z.infer<typeof PayloadSchema>;

export const BulkPayloadSchema = z.object({
  pixels: z.array(PayloadSchema),
});

export type BulkPayload = z.infer<typeof BulkPayloadSchema>;
