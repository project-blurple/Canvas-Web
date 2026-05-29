import z from "zod";

import { CanvasIdParamModel } from "./canvas.models";

export const SnapshotRangeQueryModel = z
  .object({
    fromDateTime: z.coerce.date().optional(),
    toDateTime: z.coerce.date().optional(),
  })
  .superRefine(({ fromDateTime, toDateTime }, ctx) => {
    if (fromDateTime && toDateTime && fromDateTime >= toDateTime) {
      ctx.addIssue({
        code: "custom",
        message: "fromDateTime must be before toDateTime",
      });
    }
  });

export const SnapshotImageParamModel = CanvasIdParamModel.extend({
  snapshotAtMs: z.coerce.number().int().positive(),
});
