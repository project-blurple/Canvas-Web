import type { AuditActorRole } from "@blurple-canvas-web/types";
import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  Logger,
  type NestInterceptor,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { EventEmitter2 } from "@nestjs/event-emitter";
import type { Request } from "express";
import { type Observable, tap } from "rxjs";

import { AUDIT_ACTOR_ROLE, getStagedAuditEntry } from "./audit.decorator";
import { AUDIT_EVENT, type AuditEventPayload } from "./audit.events";

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();

    return next.handle().pipe(tap(() => this.flush(context, request)));
  }

  private flush(context: ExecutionContext, request: Request): void {
    const entry = getStagedAuditEntry(request);
    if (!entry) return;

    const user = request.user as { id?: string } | undefined;
    if (!user?.id) {
      this.logger.error(
        `Audit entry "${entry.action}" has no authenticated actor; skipping.`,
      );
      return;
    }

    const actorRole = this.reflector.getAllAndOverride<
      AuditActorRole | undefined
    >(AUDIT_ACTOR_ROLE, [context.getHandler(), context.getClass()]);
    if (!actorRole) {
      this.logger.error(
        `Audit entry "${entry.action}" has no actor role; skipping. ` +
          "Did you forget @RequiresCanvasAdmin()/@RequiresCanvasModerator()?",
      );
      return;
    }

    const payload: AuditEventPayload = {
      actorId: user.id,
      actorRole,
      action: entry.action,
      resourceId:
        entry.resourceId === undefined || entry.resourceId === null ?
          null
        : String(entry.resourceId),
      metadata: entry.metadata,
    };

    this.eventEmitter.emit(AUDIT_EVENT, payload);
  }
}
