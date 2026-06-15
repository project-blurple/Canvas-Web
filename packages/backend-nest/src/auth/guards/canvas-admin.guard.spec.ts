import type { ExecutionContext } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import type { Request } from "express";

import { CanvasAdminGuard } from "@/auth/guards/canvas-admin.guard";
import { LoggedInGuard } from "@/auth/guards/logged-in.guard";
import { ForbiddenError } from "@/common/errors/forbidden.error";
import { UnauthorizedError } from "@/common/errors/unauthorized.error";
import { DiscordGuildService } from "@/discord/discord-guild.service";
import { DiscordTokenService } from "@/discord/discord-token.service";
import { mockDiscordUser as mockUser } from "@/test/fixtures/users";

const mockGuildService = {
  isCanvasAdmin: vi.fn(),
  isCanvasModerator: vi.fn(),
} satisfies Partial<Record<keyof DiscordGuildService, unknown>>;

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

describe("CanvasAdminGuard", () => {
  let moduleRef: TestingModule;
  let guard: CanvasAdminGuard;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [
        LoggedInGuard,
        CanvasAdminGuard,
        DiscordTokenService,
        { provide: DiscordGuildService, useValue: mockGuildService },
      ],
    }).compile();
    guard = moduleRef.get(CanvasAdminGuard);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("activates when the user is an admin", async () => {
    mockGuildService.isCanvasAdmin.mockResolvedValueOnce(true);

    await expect(guard.canActivate(makeContext(makeRequest()))).resolves.toBe(
      true,
    );
  });

  it("throws ForbiddenError when the user is not an admin", async () => {
    mockGuildService.isCanvasAdmin.mockResolvedValueOnce(false);

    await expect(
      guard.canActivate(makeContext(makeRequest())),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("throws UnauthorizedError when the user is not logged in", async () => {
    const context = makeContext(makeRequest({ user: undefined }));

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
    expect(mockGuildService.isCanvasAdmin).not.toHaveBeenCalled();
  });

  it("checks the admin role with the session access token", async () => {
    mockGuildService.isCanvasAdmin.mockResolvedValueOnce(true);

    await guard.canActivate(makeContext(makeRequest()));

    expect(mockGuildService.isCanvasAdmin).toHaveBeenCalledWith("test-token");
  });

  it("throws with a message describing the missing permission", async () => {
    mockGuildService.isCanvasAdmin.mockResolvedValueOnce(false);

    await expect(
      guard.canActivate(makeContext(makeRequest())),
    ).rejects.toMatchObject({
      message: "You do not have permission to perform this action",
    });
  });
});
