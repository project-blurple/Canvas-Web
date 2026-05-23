import z from "zod";
import { DiscordUserProfileSchema } from "./discordUserProfile";
import { PaletteColorSummarySchema } from "./palette";

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

export const PixelHistoryWrapperSchema = z.object({
  pixelHistory: z.array(PixelHistoryRecordSchema),
  totalEntries: z.number().int().nonnegative(),
  users: z.record(z.string(), PixelHistoryUserSummarySchema).optional(),
  executionDurationMs: z.number().nonnegative().optional(),
});

export type PixelHistoryWrapper = z.infer<typeof PixelHistoryWrapperSchema>;

export const PixelHistorySchema = PixelHistoryWrapperSchema;
export type PixelHistory = PixelHistoryWrapper;
