import { ForbiddenError } from "@/errors";

const { fetchMock, configMock } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  configMock: {
    captchaEnabled: false,
    turnstileSecretKey: undefined as string | undefined,
  },
}));

vi.mock("@/config", () => ({
  default: configMock,
}));

import { verifyTurnstileToken } from "./turnstileService";

describe("Turnstile service", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    configMock.captchaEnabled = false;
    configMock.turnstileSecretKey = undefined;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("skips verification when captcha is disabled", async () => {
    await expect(verifyTurnstileToken("token")).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects when captcha is enabled without a secret", async () => {
    configMock.captchaEnabled = true;

    await expect(verifyTurnstileToken("token")).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });
});
