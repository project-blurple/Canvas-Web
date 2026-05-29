import z from "zod";

export const SnapshotManifestSchema = z.object({
  canvasId: z.number().int().positive(),
  snapshotAt: z.iso.datetime(),
  lastIncludedHistoryAt: z.iso.datetime(),
  historyCount: z.number().int().nonnegative(),
  fileSizeBytes: z.number().int().nonnegative().nullable(),
  imagePath: z.string(),
});

export type SnapshotManifest = z.infer<typeof SnapshotManifestSchema>;
