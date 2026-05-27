import z from "zod";

export const BlocklistEntrySchema = z.object({
  /** Discord snowflake serialised as a decimal string. */
  userId: z.string().regex(/^\d+$/),
  dateAdded: z.iso.datetime(),
  username: z.string().nullable(),
  profilePictureUrl: z.string().nullable(),
});

export type BlocklistEntry = z.infer<typeof BlocklistEntrySchema>;
