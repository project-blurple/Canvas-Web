import z from "zod";
import { FrameSchema } from "./frame";
import { PaletteColorSummarySchema } from "./palette";
import { ColorDistributionList } from "./statistics";

const LeaderboardEntrySlimSchema = z.object({
  rank: z.number().int().positive(),
  userId: z.string(),
  totalPixels: z.number().int().nonnegative(),
});

export const FrameExportPackage = z.object({
  frame: FrameSchema,
  statistics: z.object({
    totalUsersInvolved: z.number().int().nonnegative(),
    totalPixelsPlaced: z.number().int().nonnegative(),
  }),
  export: z.object({
    imageUrls: z.record(z.number().int().positive(), z.url()),
    timelapseUrl: z.url().optional(),
  }),
  colorDistribution: ColorDistributionList,
  leaderboard: {
    all: LeaderboardEntrySlimSchema.array(),
    colors: z.record(
      PaletteColorSummarySchema.shape.id,
      LeaderboardEntrySlimSchema.array(),
    ),
  },
});

export type FrameExportPackage = z.infer<typeof FrameExportPackage>;
