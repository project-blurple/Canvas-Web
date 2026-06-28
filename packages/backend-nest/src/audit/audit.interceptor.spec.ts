import type { AuditActorRole } from "@blurple-canvas-web/types";
import type { CallHandler, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Test, type TestingModule } from "@nestjs/testing";
import type { Request } from "express";
import { firstValueFrom, of } from "rxjs";

import { type AuditEntryInput, STAGED_AUDIT_ENTRY } from "./audit.decorator";
import { AUDIT_EVENT } from "./audit.events";
import { AuditInterceptor } from "./audit.interceptor";

const DEFAULT_USER: { id?: string } = { id: "1" };

function makeRequest(
  stagedEntry?: AuditEntryInput,
  user: { id?: string } = DEFAULT_USER,
): Request {
  const request = { user } as unknown as Request;
  if (stagedEntry) {
    (request as unknown as Record<PropertyKey, unknown>)[STAGED_AUDIT_ENTRY] =
      stagedEntry;
  }
  return request;
}

function makeContext(request: Request): ExecutionContext {
  return {
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe("AuditInterceptor", () => {
  const emit = vi.fn();
  const getAllAndOverride = vi.fn();
  let interceptor: AuditInterceptor;
  let moduleRef: TestingModule;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [
        AuditInterceptor,
        { provide: Reflector, useValue: { getAllAndOverride } },
        { provide: EventEmitter2, useValue: { emit } },
      ],
    }).compile();
    interceptor = moduleRef.get(AuditInterceptor);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    getAllAndOverride.mockReturnValue("admin" satisfies AuditActorRole);
  });

  function run(context: ExecutionContext, result?: unknown) {
    const next: CallHandler = { handle: () => of(result) };
    return firstValueFrom(interceptor.intercept(context, next));
  }

  it("passes the response through unchanged", async () => {
    await expect(run(makeContext(makeRequest()), { id: 7 })).resolves.toEqual({
      id: 7,
    });
  });

  it("does not emit when the handler stages nothing", async () => {
    await run(makeContext(makeRequest()), { id: 7 });

    expect(emit).not.toHaveBeenCalled();
  });

  it("enriches a staged entry with the actor and role", async () => {
    await run(
      makeContext(
        makeRequest({
          action: "notice.create",
          resourceId: 42,
          metadata: { header: "hi" },
        }),
      ),
    );

    expect(emit).toHaveBeenCalledWith(AUDIT_EVENT, {
      actorId: "1",
      actorRole: "admin",
      action: "notice.create",
      resourceId: "42",
      metadata: { header: "hi" },
    });
  });

  it("records a null resource id when the entry omits it", async () => {
    await run(makeContext(makeRequest({ action: "notice.create" })));

    expect(emit).toHaveBeenCalledWith(
      AUDIT_EVENT,
      expect.objectContaining({ resourceId: null, metadata: undefined }),
    );
  });

  it("does not emit for an unauthenticated request", async () => {
    await run(
      makeContext(makeRequest({ action: "notice.create" }, { id: undefined })),
    );

    expect(emit).not.toHaveBeenCalled();
  });

  it("does not emit when the route has no actor role", async () => {
    getAllAndOverride.mockReturnValue(undefined);

    await run(makeContext(makeRequest({ action: "notice.create" })));

    expect(emit).not.toHaveBeenCalled();
  });
});
