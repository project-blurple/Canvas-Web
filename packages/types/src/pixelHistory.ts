import z from "zod";
import { DiscordUserProfileSchema } from "./discordUserProfile.js";
import { paginatedSchema } from "./pagination.js";
import { PaletteColorSummarySchema } from "./palette.js";

export const PixelHistoryRecordSchema = z.object({
  id: z.string(),
  color: PaletteColorSummarySchema,
  timestamp: z.iso.datetime(),
  guildId: z.string().optional(),
  userId: z.string(),
  userProfile: DiscordUserProfileSchema.nullable(),
});

export type PixelHistoryRecord = z.infer<typeof PixelHistoryRecordSchema>;

export const PixelHistoryUserSummarySchema = z.object({
  count: z.number().int().nonnegative(),
  colors: z.record(z.string(), z.number().int().nonnegative()),
  firstPlaced: z.iso.datetime(),
  lastPlaced: z.iso.datetime(),
  userProfile: DiscordUserProfileSchema.nullable(),
});

export type PixelHistoryUserSummary = z.infer<
  typeof PixelHistoryUserSummarySchema
>;

export const PixelHistoryWrapperSchema = z
  .object({
    users: z.record(z.string(), PixelHistoryUserSummarySchema).optional(),
    executionDurationMs: z.number().nonnegative().optional(),
  })
  .extend(paginatedSchema(PixelHistoryRecordSchema).shape);

export type PixelHistoryWrapper = z.infer<typeof PixelHistoryWrapperSchema>;
