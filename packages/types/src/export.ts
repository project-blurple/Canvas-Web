import z from "zod";
import { FrameSchema } from "./frame";
import { PaletteColorSummarySchema } from "./palette";
import {
  ColorDistributionList,
  FrameStatisticsSummarySchema,
  LeaderboardEntrySchema,
} from "./statistics";

const LeaderboardEntrySlimSchema = LeaderboardEntrySchema.pick({
  rank: true,
  userId: true,
  totalPixels: true,
});

export const FrameExportPackage = z.object({
  frame: FrameSchema,
  statistics: FrameStatisticsSummarySchema.pick({
    totalUsersInvolved: true,
    totalPixelsPlaced: true,
  }),
  export: z.object({
    imageUrls: z.record(z.number().int().positive(), z.url()),
    timelapseUrl: z.url().optional(),
  }),
  lastUpdated: z.iso.datetime(),
  colorDistribution: ColorDistributionList,
  leaderboard: {
    all: LeaderboardEntrySlimSchema.array(),
    colors: z.record(
      PaletteColorSummarySchema.shape.id,
      LeaderboardEntrySlimSchema.array(),
    ),
  },
  palette: z.array(
    PaletteColorSummarySchema.pick({
      id: true,
      name: true,
      code: true,
      rgba: true,
    }),
  ),
});

export type FrameExportPackage = z.infer<typeof FrameExportPackage>;
