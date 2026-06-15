import type { ExecutionContext } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import type { Request } from "express";

import { LoggedInGuard } from "@/auth/guards/logged-in.guard";
import { UnauthorizedError } from "@/common/errors/unauthorized.error";
import { mockDiscordUser as mockUser } from "@/test/fixtures/users";

function makeRequest(overrides: Partial<Request> = {}): Request {
  return {
    user: mockUser,
    session: {
      discordAccessToken: "test-token",
    },
    ...overrides,
  } as unknown as Request;
}

function makeContext(request: Request): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe("LoggedInGuard", () => {
  let guard: LoggedInGuard;
  let moduleRef: TestingModule;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [LoggedInGuard],
    }).compile();
    guard = moduleRef.get(LoggedInGuard);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("activates when the user is authenticated", () => {
    expect(guard.canActivate(makeContext(makeRequest()))).resolves.toBe(true);
  });

  it("activates for refresh-token-only sessions", () => {
    const request = makeRequest({
      session: { discordRefreshToken: "refresh-token" },
    } as unknown as Partial<Request>);

    expect(guard.canActivate(makeContext(request))).resolves.toBe(true);
  });

  it("throws UnauthorizedError when the user is missing", () => {
    const context = makeContext(makeRequest({ user: undefined }));

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedError);
  });

  it("throws UnauthorizedError when tokens are missing", () => {
    const context = makeContext(
      makeRequest({ session: {} } as unknown as Partial<Request>),
    );

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedError);
  });

  it("throws with the parity error message", () => {
    const context = makeContext(makeRequest({ user: undefined }));

    expect(() => guard.canActivate(context)).toThrow(
      "User is not authenticated",
    );
  });
});
