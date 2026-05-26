import type { Prisma } from "@/client";
import { prisma } from "@/client";
import type { snapshot_manifest } from "@/client/snapshots";
import { snapshotPrisma } from "@/client/snapshots";

export interface GetLatestHistoryEntryInRangeParams {
  canvasId: number;
  from: Date;
  to: Date;
}

const historyEntrySelect = {
  id: true,
  canvas_id: true,
  user_id: true,
  x: true,
  y: true,
  color_id: true,
  timestamp: true,
  guild_id: true,
  color: true,
} as const satisfies Prisma.historySelect;

export type LatestHistoryEntry = Prisma.historyGetPayload<{
  select: typeof historyEntrySelect;
}>;

export type LatestSnapshotForCanvas = snapshot_manifest;

export interface GetLatestSnapshotForCanvasParams {
  canvasId: number;
  before: Date;
}

interface LatestHistoryEntryRow {
  id: bigint;
  canvas_id: number;
  user_id: bigint;
  x: number;
  y: number;
  color_id: number;
  timestamp: Date;
  guild_id: bigint | null;
  color__id: number;
  color__code: string;
  color__emoji_name: string | null;
  color__emoji_id: bigint | null;
  color__global: boolean;
  color__name: string;
  color__rgba: number[];
}

/**
 * Gets the latest history entry for each coordinate on a canvas within a timestamp range.
 *
 * The range is inclusive at the start and exclusive at the end so adjacent
 * snapshot windows do not overlap.
 */
export async function getLatestHistoryEntriesInRange({
  canvasId,
  from,
  to,
}: GetLatestHistoryEntryInRangeParams): Promise<LatestHistoryEntry[]> {
  if (to <= from) {
    throw new Error("to must be after from");
  }

  const rows = await prisma.$queryRaw<LatestHistoryEntryRow[]>`
    SELECT DISTINCT ON (h.x, h.y)
      h.id,
      h.canvas_id,
      h.user_id,
      h.x,
      h.y,
      h.color_id,
      h.timestamp,
      h.guild_id,
      c.id AS color__id,
      c.code AS color__code,
      c.emoji_name AS color__emoji_name,
      c.emoji_id AS color__emoji_id,
      c.global AS color__global,
      c.name AS color__name,
      c.rgba AS color__rgba
    FROM history h
    INNER JOIN color c ON c.id = h.color_id
    WHERE h.canvas_id = ${canvasId}
      AND h.erased_at IS NULL
      AND h.timestamp >= ${from}
      AND h.timestamp < ${to}
    ORDER BY h.x, h.y, h.timestamp DESC, h.id DESC
  `;

  return rows.map((row) => ({
    id: row.id,
    canvas_id: row.canvas_id,
    user_id: row.user_id,
    x: row.x,
    y: row.y,
    color_id: row.color_id,
    timestamp: row.timestamp,
    guild_id: row.guild_id,
    color: {
      id: row.color__id,
      code: row.color__code,
      emoji_name: row.color__emoji_name,
      emoji_id: row.color__emoji_id,
      global: row.color__global,
      name: row.color__name,
      rgba: row.color__rgba,
    },
  }));
}

/**
 * Gets the latest snapshot manifest for a canvas before the specified cutoff, if one exists.
 */
export async function getLatestSnapshotForCanvas({
  canvasId,
  before,
}: GetLatestSnapshotForCanvasParams): Promise<LatestSnapshotForCanvas | null> {
  return snapshotPrisma.snapshot_manifest.findFirst({
    where: {
      canvas_id: canvasId,
      snapshot_at: {
        lt: before,
      },
    },
    orderBy: [{ snapshot_at: "desc" }, { id: "desc" }],
  });
}
