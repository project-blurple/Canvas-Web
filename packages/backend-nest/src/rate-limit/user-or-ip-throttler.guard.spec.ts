import type { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Test, type TestingModule } from "@nestjs/testing";
import { ThrottlerModule } from "@nestjs/throttler";
import type { Request } from "express";

import { RATE_LIMIT_BUCKET } from "./rate-limit.constants";
import { UserOrIpThrottlerGuard } from "./user-or-ip-throttler.guard";

/** Exposes the protected tracker/key/skip methods for direct assertions. */
class TestGuard extends UserOrIpThrottlerGuard {
  track(req: Partial<Request>): Promise<string> {
    return this.getTracker(req as unknown as Record<string, unknown>);
  }

  key(context: ExecutionContext, suffix: string, name: string): string {
    return this.generateKey(context, suffix, name);
  }

  skip(context: ExecutionContext): Promise<boolean> {
    return this.shouldSkip(context);
  }
}

class PixelController {}
function placePixel() {
  return null;
}

function makeContext(): ExecutionContext {
  return {
    getHandler: () => placePixel,
    getClass: () => PixelController,
  } as unknown as ExecutionContext;
}

describe("UserOrIpThrottlerGuard", () => {
  const getAllAndOverride = vi.fn();
  let guard: TestGuard;
  let moduleRef: TestingModule;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [{ name: "default", ttl: 1000, limit: 1 }],
        }),
      ],
      providers: [TestGuard],
    })
      .overrideProvider(Reflector)
      .useValue({ getAllAndOverride })
      .compile();
    guard = moduleRef.get(TestGuard);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  beforeEach(() => {
    getAllAndOverride.mockReset();
  });

  describe("shouldSkip", () => {
    it("skips routes that did not opt in to rate limiting", async () => {
      getAllAndOverride.mockReturnValue(undefined);

      await expect(guard.skip(makeContext())).resolves.toBe(true);
    });

    it("throttles routes carrying a bucket", async () => {
      getAllAndOverride.mockReturnValue("pixel-placement");

      await expect(guard.skip(makeContext())).resolves.toBe(false);
    });
  });

  describe("getTracker", () => {
    it("keys by the authenticated user first", async () => {
      await expect(
        guard.track({
          user: { id: "123456789" },
          headers: { "x-forwarded-for": "203.0.113.7" },
        } as unknown as Request),
      ).resolves.toBe("user-123456789");
    });

    it("falls back to the first X-Forwarded-For entry when anonymous", async () => {
      await expect(
        guard.track({
          headers: {
            "x-forwarded-for": "203.0.113.7, 70.41.3.18, 150.172.238.178",
          },
        } as unknown as Request),
      ).resolves.toBe("203.0.113.7");
    });

    it("uses the first element when X-Forwarded-For is an array", async () => {
      await expect(
        guard.track({
          headers: { "x-forwarded-for": ["198.51.100.2", "203.0.113.7"] },
        } as unknown as Request),
      ).resolves.toBe("198.51.100.2");
    });

    it("falls back to the socket IP when there is no forwarded header", async () => {
      await expect(
        guard.track({ headers: {}, ip: "192.0.2.55" } as unknown as Request),
      ).resolves.toBe("192.0.2.55");
    });

    it("gives different anonymous IPs independent trackers", async () => {
      const first = await guard.track({
        headers: { "x-forwarded-for": "203.0.113.7" },
      } as unknown as Request);
      const second = await guard.track({
        headers: { "x-forwarded-for": "203.0.113.8" },
      } as unknown as Request);

      expect(first).not.toBe(second);
    });
  });

  describe("generateKey", () => {
    it("buckets by route metadata so related routes share a budget", () => {
      getAllAndOverride.mockReturnValue("frame-mutation");

      const key = guard.key(makeContext(), "user-1", "default");

      expect(getAllAndOverride).toHaveBeenCalledWith(
        RATE_LIMIT_BUCKET,
        expect.any(Array),
      );
      expect(key).toBe("frame-mutation-default-user-1");
    });

    it("falls back to a per-handler key when no bucket is set", () => {
      getAllAndOverride.mockReturnValue(undefined);

      const key = guard.key(makeContext(), "user-1", "default");

      expect(key).toBe("PixelController-placePixel-default-user-1");
    });
  });
});
