import z from "zod";

export const NoticeTypeSchema = z.enum(["info", "warning", "error"]);

export type NoticeType = z.infer<typeof NoticeTypeSchema>;

export const NoticeSchema = z.object({
  id: z.number().int().positive(),
  type: NoticeTypeSchema,
  header: z.string().nullable(),
  content: z.string().nullable(),
  /** lower number means higher priority */
  priority: z.number().int(),
  startAt: z.iso.datetime().nullable(),
  endAt: z.iso.datetime().nullable(),
  persisted: z.boolean(),
  canvasId: z.number().int().nullable(),
  createdAt: z.iso.datetime(),
});

export type Notice = z.infer<typeof NoticeSchema>;
