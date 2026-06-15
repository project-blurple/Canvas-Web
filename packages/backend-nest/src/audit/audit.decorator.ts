import type { AuditAction, AuditActorRole } from "@blurple-canvas-web/types";
import {
  createParamDecorator,
  type ExecutionContext,
  SetMetadata,
} from "@nestjs/common";
import type { Request } from "express";

export const AUDIT_ACTOR_ROLE = "audit:actorRole";
export const STAGED_AUDIT_ENTRY = Symbol("stagedAuditEntry");

export interface AuditEntryInput {
  action: AuditAction;
  resourceId?: string | number | bigint | null;
  metadata?: unknown;
}

export interface Audit {
  record(entry: AuditEntryInput): void;
}

interface AuditCapableRequest extends Request {
  [STAGED_AUDIT_ENTRY]?: AuditEntryInput;
}

export const Audit = createParamDecorator(
  (_data: unknown, context: ExecutionContext): Audit => {
    const request = context.switchToHttp().getRequest<AuditCapableRequest>();

    return {
      record(entry) {
        request[STAGED_AUDIT_ENTRY] = entry;
      },
    };
  },
);

export function getStagedAuditEntry(
  request: Request,
): AuditEntryInput | undefined {
  return (request as AuditCapableRequest)[STAGED_AUDIT_ENTRY];
}

export function setActorRole(role: AuditActorRole) {
  return SetMetadata(AUDIT_ACTOR_ROLE, role);
}
