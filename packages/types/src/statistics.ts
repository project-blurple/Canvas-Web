import z from "zod";
import { PaletteColorSummarySchema } from "./palette.js";

export const UserStatsSchema = z.object({
  userId: z.string(),
  canvasId: z.number().int().positive(),
  totalPixels: z.number().int().nonnegative().optional(),
  rank: z.number().int().positive().optional(),
  mostFrequentColor: PaletteColorSummarySchema.optional(),
  // placeFrequency: z.string().optional(),  // Not currently supported by Prisma
  mostRecentTimestamp: z.iso.datetime().optional(),
});

export type UserStats = z.infer<typeof UserStatsSchema>;

export const LeaderboardEntrySchema = z.object({
  rank: z.number().int().positive(),
  userId: z.string(),
  totalPixels: z.number().int().nonnegative(),
  username: z.string().optional(),
  profilePictureUrl: z.string(),
});

export type LeaderboardEntry = z.infer<typeof LeaderboardEntrySchema>;

export const CanvasStatisticsSummarySchema = z.object({
  canvasId: z.number().int().positive(),
  totalUsersInvolved: z.number().int().nonnegative(),
  totalPixelsPlaced: z.number().int().nonnegative(),
  lastPlacedAt: z.iso.datetime().nullable(),
});

export type CanvasStatisticsSummary = z.infer<
  typeof CanvasStatisticsSummarySchema
>;

export const EventStatisticsSummarySchema = z.object({
  eventId: z.number().int(),
  totalUsersInvolved: z.number().int().nonnegative(),
  totalPixelsPlaced: z.number().int().nonnegative(),
});

export type EventStatisticsSummary = z.infer<
  typeof EventStatisticsSummarySchema
>;

export const FrameStatisticsSummarySchema = z.object({
  frameId: z.string().regex(/^[0-9a-fA-F]{6}$/),
  totalUsersInvolved: z.number().int().nonnegative(),
  totalPixelsPlaced: z.number().int().nonnegative(),
  lastPlacedAt: z.iso.datetime().nullable(),
});

export type FrameStatisticsSummary = z.infer<
  typeof FrameStatisticsSummarySchema
>;
