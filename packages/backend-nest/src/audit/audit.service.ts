import type {
  AuditActorRole,
  AuditLogEntry,
  AuditLogPage,
} from "@blurple-canvas-web/types";
import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";

import { Prisma } from "@/common/database/prisma.client";
import { PrismaService } from "@/common/database/prisma.service";
import { AUDIT_EVENT, type AuditEventPayload } from "./audit.events";

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

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Runs separately from the request, so a logging failure never affects the user-facing operation.
   * `resourceType` is derived from the action prefix.
   */
  @OnEvent(AUDIT_EVENT, { async: true })
  async handleAuditEvent(payload: AuditEventPayload): Promise<void> {
    const resourceType = payload.action.split(".")[0];

    try {
      await this.prisma.auditLog.create({
        data: {
          actorId: BigInt(payload.actorId),
          actorRole: payload.actorRole,
          action: payload.action,
          resourceType,
          resourceId: payload.resourceId,
          metadata: payload.metadata as Prisma.InputJsonValue | undefined,
        },
      });
    } catch (error) {
      this.logger.error("Audit log write failed", {
        action: payload.action,
        error,
      });
    }
  }

  async getAuditLog(params: GetAuditLogParams = {}): Promise<AuditLogPage> {
    const limit = Math.min(
      Math.max(params.limit ?? DEFAULT_LIMIT, 1),
      MAX_LIMIT,
    );

    const where = this.buildAuditLogWhere(params);
    if (where === null) {
      return { entries: [], nextCursor: null };
    }

    const rows = await this.prisma.auditLog.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      include: {
        actor: {
          select: {
            discordUserProfile: {
              select: {
                username: true,
                profilePictureUrl: true,
              },
            },
          },
        },
      },
    });

    const hasMore = rows.length > limit;
    const visible = hasMore ? rows.slice(0, limit) : rows;

    const entries = visible.map<AuditLogEntry>((row) => ({
      id: row.id.toString(),
      createdAt: row.createdAt.toISOString(),
      actorId: row.actorId.toString(),
      actorRole: row.actorRole as AuditActorRole,
      actorUsername: row.actor.discordUserProfile?.username ?? null,
      actorProfilePictureUrl:
        row.actor.discordUserProfile?.profilePictureUrl ?? null,
      action: row.action,
      resourceType: row.resourceType ?? null,
      resourceId: row.resourceId ?? null,
      metadata: row.metadata ?? null,
    }));

    const nextCursor =
      hasMore ? this.encodeCursor(visible[visible.length - 1]) : null;

    return { entries, nextCursor };
  }

  private encodeCursor(row: { createdAt: Date; id: bigint }): string {
    const payload: CursorPayload = {
      createdAt: row.createdAt.toISOString(),
      id: row.id.toString(),
    };
    return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  }

  private decodeCursor(cursor: string): CursorPayload | null {
    try {
      const json = Buffer.from(cursor, "base64url").toString("utf8");
      const parsed = JSON.parse(json) as CursorPayload;
      if (
        typeof parsed.createdAt !== "string" ||
        typeof parsed.id !== "string"
      ) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  private applyActorFilter(
    where: Prisma.AuditLogWhereInput,
    actorId: string,
  ): boolean {
    try {
      where.actorId = BigInt(actorId);
      return true;
    } catch {
      return false;
    }
  }

  private applyCursorFilter(
    where: Prisma.AuditLogWhereInput,
    cursor: string,
  ): boolean {
    const decoded = this.decodeCursor(cursor);
    if (!decoded) return false;
    let cursorId: bigint;
    try {
      cursorId = BigInt(decoded.id);
    } catch {
      return false;
    }
    const cursorDate = new Date(decoded.createdAt);
    if (Number.isNaN(cursorDate.getTime())) return false;
    // Keyset pagination over (created_at DESC, id DESC). `created_at` is stored
    // at microsecond precision, but the cursor round-trips through a
    // millisecond-precision JS Date. Matching the whole-millisecond bucket
    // (instead of exact equality) avoids skipping rows that share the cursor's
    // millisecond but differ in sub-millisecond microseconds.
    const cursorUpperBound = new Date(cursorDate.getTime() + 1);
    where.OR = [
      { createdAt: { lt: cursorDate } },
      {
        createdAt: { gte: cursorDate, lt: cursorUpperBound },
        id: { lt: cursorId },
      },
    ];
    return true;
  }

  private buildAuditLogWhere(
    params: GetAuditLogParams,
  ): Prisma.AuditLogWhereInput | null {
    const where: Prisma.AuditLogWhereInput = {};

    if (params.actorId && !this.applyActorFilter(where, params.actorId)) {
      return null;
    }
    if (params.action) {
      where.action =
        params.action.endsWith(".") ?
          { startsWith: params.action }
        : params.action;
    }
    if (params.resourceType) {
      where.resourceType = params.resourceType;
    }
    if (params.resourceId) {
      where.resourceId = params.resourceId;
    }
    if (params.from || params.to) {
      where.createdAt = {
        ...(params.from ? { gte: params.from } : {}),
        ...(params.to ? { lte: params.to } : {}),
      };
    }
    if (params.cursor && !this.applyCursorFilter(where, params.cursor)) {
      return null;
    }

    return where;
  }
}
