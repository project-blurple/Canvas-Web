import type { ExecutionContext } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import type { Request } from "express";

import { BotApiKeyGuard } from "@/auth/guards/bot-api-key.guard";
import { UnauthorizedError } from "@/common/errors/unauthorized.error";
import {
  type PlacementConfig,
  placementConfig,
} from "@/config/placement.config";

const testPlacementConfig: PlacementConfig = {
  webGuildId: 0,
  webPlacingEnabled: true,
  botPlacingEnabled: true,
  botApiKey: "secret-key",
};

function makeContext(request: Request): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

function makeApiRequest(apiKey?: string): Request {
  return {
    header: (name: string) => (name === "x-api-key" ? apiKey : undefined),
  } as unknown as Request;
}

describe("BotApiKeyGuard", () => {
  let moduleRef: TestingModule;
  let guard: BotApiKeyGuard;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [
        BotApiKeyGuard,
        { provide: placementConfig.KEY, useValue: testPlacementConfig },
      ],
    }).compile();
    guard = moduleRef.get(BotApiKeyGuard);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("activates when the api key matches", () => {
    expect(guard.canActivate(makeContext(makeApiRequest("secret-key")))).toBe(
      true,
    );
  });

  it("throws UnauthorizedError when the header is missing", () => {
    expect(() => guard.canActivate(makeContext(makeApiRequest()))).toThrow(
      UnauthorizedError,
    );
  });

  it("throws UnauthorizedError when the key does not match", () => {
    expect(() =>
      guard.canActivate(makeContext(makeApiRequest("wrong-key"))),
    ).toThrow(UnauthorizedError);
  });

  it("throws UnauthorizedError when no key is configured", async () => {
    const keylessModuleRef = await Test.createTestingModule({
      providers: [
        BotApiKeyGuard,
        {
          provide: placementConfig.KEY,
          useValue: { ...testPlacementConfig, botApiKey: undefined },
        },
      ],
    }).compile();
    const keylessGuard = keylessModuleRef.get(BotApiKeyGuard);

    expect(() =>
      keylessGuard.canActivate(makeContext(makeApiRequest("secret-key"))),
    ).toThrow(UnauthorizedError);

    await keylessModuleRef.close();
  });

  it("throws with the parity error message", () => {
    expect(() => guard.canActivate(makeContext(makeApiRequest()))).toThrow(
      "Invalid API key",
    );
  });
});
