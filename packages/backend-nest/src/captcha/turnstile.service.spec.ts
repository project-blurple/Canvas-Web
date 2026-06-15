import { ForbiddenError } from "@/common/errors/forbidden.error";
import type { CaptchaConfig } from "@/config/captcha.config";
import { TurnstileService } from "./turnstile.service";

function makeService(config: Partial<CaptchaConfig>): TurnstileService {
  return new TurnstileService({
    enabled: false,
    turnstileSecretKey: undefined,
    ...config,
  });
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

  describe("onModuleInit", () => {
    it("throws when enabled without a secret key", () => {
      const service = makeService({ enabled: true });

      expect(() => service.onModuleInit()).toThrow(/TURNSTILE_SECRET_KEY/);
    });

    it("does not throw when enabled with a secret key", () => {
      const service = makeService({
        enabled: true,
        turnstileSecretKey: "secret",
      });

      expect(() => service.onModuleInit()).not.toThrow();
    });

    it("does not throw when disabled", () => {
      const service = makeService({ enabled: false });

      expect(() => service.onModuleInit()).not.toThrow();
    });
  });

  describe("verify", () => {
    it("is a no-op (no network call) when captcha is disabled", async () => {
      const service = makeService({ enabled: false });

      await expect(service.verify("token")).resolves.toBeUndefined();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("verifies the token against Cloudflare when the token is valid", async () => {
      fetchMock.mockResolvedValueOnce(siteverifyResponse({ success: true }));
      const service = makeService({
        enabled: true,
        turnstileSecretKey: "secret",
      });

      await expect(service.verify("good-token")).resolves.toBeUndefined();

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [, init] = fetchMock.mock.calls[0];
      const body = init?.body as URLSearchParams;
      expect(body.get("secret")).toBe("secret");
      expect(body.get("response")).toBe("good-token");
    });

    it("throws ForbiddenError when Cloudflare reports failure", async () => {
      fetchMock.mockResolvedValueOnce(siteverifyResponse({ success: false }));
      const service = makeService({
        enabled: true,
        turnstileSecretKey: "secret",
      });

      await expect(service.verify("bad-token")).rejects.toBeInstanceOf(
        ForbiddenError,
      );
    });

    it("throws ForbiddenError on a non-OK HTTP response", async () => {
      fetchMock.mockResolvedValueOnce(
        siteverifyResponse({ success: true }, { status: 500 }),
      );
      const service = makeService({
        enabled: true,
        turnstileSecretKey: "secret",
      });

      await expect(service.verify("token")).rejects.toBeInstanceOf(
        ForbiddenError,
      );
    });

    it("throws ForbiddenError when the request itself fails", async () => {
      fetchMock.mockRejectedValueOnce(new Error("network down"));
      const service = makeService({
        enabled: true,
        turnstileSecretKey: "secret",
      });

      await expect(service.verify("token")).rejects.toBeInstanceOf(
        ForbiddenError,
      );
    });

    it("throws ForbiddenError when enabled but unconfigured", async () => {
      const service = makeService({ enabled: true });

      await expect(service.verify("token")).rejects.toBeInstanceOf(
        ForbiddenError,
      );
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
