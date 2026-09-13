import { Test, type TestingModule } from "@nestjs/testing";

import { ForbiddenError } from "@/common/errors/forbidden.error";
import { type CaptchaConfig, captchaConfig } from "@/config/captcha.config";
import { TurnstileService } from "./turnstile.service";

function createModule(config: CaptchaConfig): Promise<TestingModule> {
  return Test.createTestingModule({
    providers: [
      TurnstileService,
      { provide: captchaConfig.KEY, useValue: config },
    ],
  }).compile();
}

function siteverifyResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), { status: 200, ...init });
}

describe("TurnstileService", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("when enabled and configured", () => {
    let moduleRef: TestingModule;
    let service: TurnstileService;

    beforeAll(async () => {
      moduleRef = await createModule({
        enabled: true,
        turnstileSecretKey: "secret",
      });
      service = moduleRef.get(TurnstileService);
    });

    afterAll(async () => {
      await moduleRef.close();
    });

    it("onModuleInit accepts the configuration", () => {
      expect(() => service.onModuleInit()).not.toThrow();
    });

    it("verifies the token against Cloudflare", async () => {
      fetchMock.mockResolvedValueOnce(siteverifyResponse({ success: true }));

      await expect(service.verify("good-token")).resolves.toBeUndefined();

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [, init] = fetchMock.mock.calls[0];
      const body = init?.body as URLSearchParams;
      expect(body.get("secret")).toBe("secret");
      expect(body.get("response")).toBe("good-token");
    });

    it("throws ForbiddenError when Cloudflare reports failure", async () => {
      fetchMock.mockResolvedValueOnce(siteverifyResponse({ success: false }));

      await expect(service.verify("bad-token")).rejects.toBeInstanceOf(
        ForbiddenError,
      );
    });

    it("throws ForbiddenError on a non-OK HTTP response", async () => {
      fetchMock.mockResolvedValueOnce(
        siteverifyResponse({ success: true }, { status: 500 }),
      );

      await expect(service.verify("token")).rejects.toBeInstanceOf(
        ForbiddenError,
      );
    });

    it("throws ForbiddenError when the request itself fails", async () => {
      fetchMock.mockRejectedValueOnce(new Error("network down"));

      await expect(service.verify("token")).rejects.toBeInstanceOf(
        ForbiddenError,
      );
    });
  });

  describe("when disabled", () => {
    let moduleRef: TestingModule;
    let service: TurnstileService;

    beforeAll(async () => {
      moduleRef = await createModule({
        enabled: false,
        turnstileSecretKey: undefined,
      });
      service = moduleRef.get(TurnstileService);
    });

    afterAll(async () => {
      await moduleRef.close();
    });

    it("onModuleInit accepts the configuration", () => {
      expect(() => service.onModuleInit()).not.toThrow();
    });

    it("verify is a no-op without a network call", async () => {
      await expect(service.verify("token")).resolves.toBeUndefined();
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe("when enabled but unconfigured", () => {
    let moduleRef: TestingModule;
    let service: TurnstileService;

    beforeAll(async () => {
      moduleRef = await createModule({
        enabled: true,
        turnstileSecretKey: undefined,
      });
      service = moduleRef.get(TurnstileService);
    });

    afterAll(async () => {
      await moduleRef.close();
    });

    it("onModuleInit throws so the misconfiguration fails fast", () => {
      expect(() => service.onModuleInit()).toThrow(/TURNSTILE_SECRET_KEY/);
    });

    it("verify throws ForbiddenError without a network call", async () => {
      await expect(service.verify("token")).rejects.toBeInstanceOf(
        ForbiddenError,
      );
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
