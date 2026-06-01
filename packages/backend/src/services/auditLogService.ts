import type {
  AuditAction,
  AuditActorRole,
  AuditLogEntry,
  AuditLogPage,
  ResourceTypeOfAction,
} from "@blurple-canvas-web/types";
import { type audit_log, type Prisma, prisma } from "@/client";

export interface AuditOptions {
  resourceId?: string | number | bigint;
  metadata?: unknown;
}

interface AuditRequest {
  user?: { id: string };
}

export async function audit<A extends AuditAction>(
  req: AuditRequest,
  role: AuditActorRole,
  action: A,
  opts?: AuditOptions,
): Promise<void> {
  if (!req.user) return;

  const resourceType = action.split(".")[0] as ResourceTypeOfAction<A>;

  try {
    await prisma.audit_log.create({
      data: {
        actor_id: BigInt(req.user.id),
        actor_role: role,
        action,
        resource_type: resourceType,
        resource_id:
          opts?.resourceId === undefined ? null : String(opts.resourceId),
        metadata: opts?.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (error) {
    console.error("Audit log write failed", { action, error });
  }
}

export interface GetAuditLogParams {
  actorId?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  from?: Date;
  to?: Date;
  limit?: number;
  cursor?: string;
}

interface CursorPayload {
  createdAt: string;
  id: string;
}

function encodeCursor(row: Pick<audit_log, "created_at" | "id">): string {
  const payload: CursorPayload = {
    createdAt: row.created_at.toISOString(),
    id: row.id.toString(),
  };
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodeCursor(cursor: string): CursorPayload | null {
  try {
    const json = Buffer.from(cursor, "base64url").toString("utf8");
    const parsed = JSON.parse(json) as CursorPayload;
    if (typeof parsed.createdAt !== "string" || typeof parsed.id !== "string") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

function applyActorFilter(
  where: Prisma.audit_logWhereInput,
  actorId: string,
): boolean {
  try {
    where.actor_id = BigInt(actorId);
    return true;
  } catch {
    return false;
  }
}

function applyCursorFilter(
  where: Prisma.audit_logWhereInput,
  cursor: string,
): boolean {
  const decoded = decodeCursor(cursor);
  if (!decoded) return false;
  let cursorId: bigint;
  try {
    cursorId = BigInt(decoded.id);
  } catch {
    return false;
  }
  const cursorDate = new Date(decoded.createdAt);
  // Keyset pagination over (created_at DESC, id DESC).
  where.OR = [
    { created_at: { lt: cursorDate } },
    { created_at: cursorDate, id: { lt: cursorId } },
  ];
  return true;
}

function buildAuditLogWhere(
  params: GetAuditLogParams,
): Prisma.audit_logWhereInput | null {
  const where: Prisma.audit_logWhereInput = {};

  if (params.actorId && !applyActorFilter(where, params.actorId)) {
    return null;
  }
  if (params.action) {
    where.action =
      params.action.endsWith(".") ?
        { startsWith: params.action }
      : params.action;
  }
  if (params.resourceType) {
    where.resource_type = params.resourceType;
  }
  if (params.resourceId) {
    where.resource_id = params.resourceId;
  }
  if (params.from || params.to) {
    where.created_at = {
      ...(params.from ? { gte: params.from } : {}),
      ...(params.to ? { lte: params.to } : {}),
    };
  }
  if (params.cursor && !applyCursorFilter(where, params.cursor)) {
    return null;
  }

  return where;
}

export async function getAuditLog(
  params: GetAuditLogParams = {},
): Promise<AuditLogPage> {
  const limit = Math.min(Math.max(params.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);

  const where = buildAuditLogWhere(params);
  if (where === null) {
    return { entries: [], nextCursor: null };
  }

  const rows = await prisma.audit_log.findMany({
    where,
    orderBy: [{ created_at: "desc" }, { id: "desc" }],
    take: limit + 1,
    include: {
      actor: {
        select: {
          discord_user_profile: {
            select: {
              username: true,
              profile_picture_url: true,
            },
          },
        },
      },
    },
  });

  const hasMore = rows.length > limit;
  const visible = hasMore ? rows.slice(0, limit) : rows;

  const entries: AuditLogEntry[] = visible.map((row) => ({
    id: row.id.toString(),
    createdAt: row.created_at.toISOString(),
    actorId: row.actor_id.toString(),
    actorRole: row.actor_role as AuditActorRole,
    actorUsername: row.actor.discord_user_profile?.username ?? null,
    actorProfilePictureUrl:
      row.actor.discord_user_profile?.profile_picture_url ?? null,
    action: row.action,
    resourceType: row.resource_type ?? null,
    resourceId: row.resource_id ?? null,
    metadata: row.metadata ?? null,
  }));

  const nextCursor = hasMore ? encodeCursor(visible[visible.length - 1]) : null;

  return { entries, nextCursor };
}
