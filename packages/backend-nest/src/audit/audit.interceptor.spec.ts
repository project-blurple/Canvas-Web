import type { AuditActorRole } from "@blurple-canvas-web/types";
import type { CallHandler, ExecutionContext } from "@nestjs/common";
import type { Reflector } from "@nestjs/core";
import type { EventEmitter2 } from "@nestjs/event-emitter";
import type { Request } from "express";
import { firstValueFrom, of } from "rxjs";

import { type AuditEntryInput, STAGED_AUDIT_ENTRY } from "./audit.decorator";
import { AUDIT_EVENT } from "./audit.events";
import { AuditInterceptor } from "./audit.interceptor";

interface HarnessOptions {
  stagedEntry?: AuditEntryInput;
  actorRole?: AuditActorRole;
  user?: { id?: string };
  result?: unknown;
}

function createHarness(options: HarnessOptions) {
  const { stagedEntry, user = { id: "1" }, result } = options;
  // Distinguish "no role" (explicit undefined) from "role omitted" (default).
  const actorRole = "actorRole" in options ? options.actorRole : "admin";

  const emit = vi.fn();
  const eventEmitter = { emit } as unknown as EventEmitter2;
  const reflector = {
    getAllAndOverride: vi.fn().mockReturnValue(actorRole),
  } as unknown as Reflector;

  const request = { user } as unknown as Request;
  if (stagedEntry) {
    (request as unknown as Record<PropertyKey, unknown>)[STAGED_AUDIT_ENTRY] =
      stagedEntry;
  }

  const context = {
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;

  const next: CallHandler = { handle: () => of(result) };
  const interceptor = new AuditInterceptor(reflector, eventEmitter);

  return { interceptor, context, next, emit };
}

async function run(harness: ReturnType<typeof createHarness>) {
  return await firstValueFrom(
    harness.interceptor.intercept(harness.context, harness.next),
  );
}

describe("AuditInterceptor", () => {
  it("passes the response through unchanged", async () => {
    const harness = createHarness({ result: { id: 7 } });

    await expect(run(harness)).resolves.toEqual({ id: 7 });
  });

  it("does not emit when the handler stages nothing", async () => {
    const harness = createHarness({ result: { id: 7 } });

    await run(harness);

    expect(harness.emit).not.toHaveBeenCalled();
  });

  it("enriches a staged entry with the actor and role", async () => {
    const harness = createHarness({
      stagedEntry: {
        action: "notice.create",
        resourceId: 42,
        metadata: { header: "hi" },
      },
    });

    await run(harness);

    expect(harness.emit).toHaveBeenCalledWith(AUDIT_EVENT, {
      actorId: "1",
      actorRole: "admin",
      action: "notice.create",
      resourceId: "42",
      metadata: { header: "hi" },
    });
  });

  it("records a null resource id when the entry omits it", async () => {
    const harness = createHarness({
      stagedEntry: { action: "notice.create" },
    });

    await run(harness);

    expect(harness.emit).toHaveBeenCalledWith(
      AUDIT_EVENT,
      expect.objectContaining({ resourceId: null, metadata: undefined }),
    );
  });

  it("does not emit for an unauthenticated request", async () => {
    const harness = createHarness({
      stagedEntry: { action: "notice.create" },
      user: { id: undefined },
    });

    await run(harness);

    expect(harness.emit).not.toHaveBeenCalled();
  });

  it("does not emit when the route has no actor role", async () => {
    const harness = createHarness({
      stagedEntry: { action: "notice.create" },
      actorRole: undefined,
    });

    await run(harness);

    expect(harness.emit).not.toHaveBeenCalled();
  });
});
