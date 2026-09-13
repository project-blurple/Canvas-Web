import type { AuditAction, AuditActorRole } from "@blurple-canvas-web/types";

export const AUDIT_EVENT = "audit.record";

export interface AuditEventPayload {
  actorId: string;
  actorRole: AuditActorRole;
  action: AuditAction;
  resourceId: string | null;
  metadata?: unknown;
}
