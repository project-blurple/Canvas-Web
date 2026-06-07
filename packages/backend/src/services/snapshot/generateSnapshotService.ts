import { readFile } from "node:fs/promises";
import sharp from "sharp";
import type { Prisma } from "@/client";
import { prisma } from "@/client";
import type { snapshot_manifest } from "@/client/snapshots";
import { snapshotPrisma } from "@/client/snapshots";
import { getCanvasInfo } from "@/services/canvasService";

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

export interface BuildSnapshotParams {
  canvasId: number;
  before: Date;
}

/**
 * Gets the latest history entry for each coordinate on a canvas within a timestamp range.
 *
 * The range is inclusive at the start and exclusive at the end so adjacent
 * snapshot windows do not overlap.
 */
async function getLatestHistoryEntriesInRange({
  canvasId,
  from,
  to,
}: GetLatestHistoryEntryInRangeParams): Promise<LatestHistoryEntry[]> {
  if (to <= from) {
    throw new Error("to must be after from");
  }

  const rows = await prisma.$kysely
    .selectFrom("history as h")
    .innerJoin("color as c", "c.id", "h.color_id")
    .select([
      "h.id",
      "h.canvas_id",
      "h.user_id",
      "h.x",
      "h.y",
      "h.color_id",
      "h.timestamp",
      "h.guild_id",
      "c.id as color__id",
      "c.code as color__code",
      "c.emoji_name as color__emoji_name",
      "c.emoji_id as color__emoji_id",
      "c.global as color__global",
      "c.name as color__name",
      "c.rgba as color__rgba",
    ])
    .distinctOn(["x", "y"])
    .where("h.canvas_id", "=", canvasId)
    .where("h.erased_at", "is", null)
    .where("h.timestamp", ">=", from)
    .where("h.timestamp", "<", to)
    .orderBy("x", "asc")
    .orderBy("y", "asc")
    .orderBy("timestamp", "desc")
    .orderBy("id", "desc")
    .execute();

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
async function getLatestSnapshotForCanvas({
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

async function snapshotManifestToRawBuffer(
  snapshot: LatestSnapshotForCanvas,
  width: number,
  height: number,
): Promise<Buffer> {
  const snapshotImage = await readFile(snapshot.image_path);
  const { data } = await sharp(snapshotImage)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const expectedLength = width * height * 4;
  if (data.length !== expectedLength) {
    throw new Error(
      `Snapshot image for canvas ${snapshot.canvas_id} has invalid dimensions: expected ${width}x${height}, got ${data.length / 4} pixels`,
    );
  }

  return data;
}

function applyHistoryEntryToRawBuffer(
  buffer: Buffer,
  width: number,
  entry: LatestHistoryEntry,
): void {
  const index = (entry.y * width + entry.x) * 4;
  const [red = 0, green = 0, blue = 0, alpha = 0] = entry.color.rgba;

  buffer[index] = red;
  buffer[index + 1] = green;
  buffer[index + 2] = blue;
  buffer[index + 3] = alpha;
}

/**
 * Builds a snapshot for a canvas using the latest snapshot prior to the cutoff,
 * or a blank canvas when no prior snapshot exists.
 */
export async function buildSnapshot({
  canvasId,
  before,
}: BuildSnapshotParams): Promise<{
  image: Buffer;
  lastIncludedHistoryAt: Date;
}> {
  const canvas = await getCanvasInfo(canvasId);
  const latestSnapshot = await getLatestSnapshotForCanvas({ canvasId, before });

  const from = latestSnapshot?.snapshot_at ?? new Date(0);
  const historyEntries = await getLatestHistoryEntriesInRange({
    canvasId,
    from,
    to: before,
  });

  const lastIncludedHistoryAt =
    historyEntries.length > 0 ?
      new Date(Math.max(...historyEntries.map((e) => e.timestamp.getTime())))
    : from;

  const rawBuffer =
    latestSnapshot ?
      await snapshotManifestToRawBuffer(
        latestSnapshot,
        canvas.width,
        canvas.height,
      )
    : (() => {
        const buffer = Buffer.alloc(canvas.width * canvas.height * 4);

        for (let index = 0; index < buffer.length; index += 4) {
          // Blank pixel background color
          buffer[index] = 88;
          buffer[index + 1] = 101;
          buffer[index + 2] = 242;
          buffer[index + 3] = 127;
        }

        return buffer;
      })();

  for (const entry of historyEntries) {
    applyHistoryEntryToRawBuffer(rawBuffer, canvas.width, entry);
  }

  const image = await sharp(rawBuffer, {
    raw: {
      width: canvas.width,
      height: canvas.height,
      channels: 4,
    },
  })
    .webp({ lossless: true })
    .toBuffer();

  return { image, lastIncludedHistoryAt };
}
