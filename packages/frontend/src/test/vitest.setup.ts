import { afterAll, afterEach, beforeAll, beforeEach, vi } from "vitest";

vi.mock("@/config/clientConfig", () => ({
  __esModule: true,
  default: {
    apiUrl: "http://localhost:8000",
    discordServerInvite: "https://projectblurple.com",
    showBotCommands: false,
  },
}));

// Silence console.error in tests unless explicitly allowed
const originalConsoleError = console.error;
let errorSpy: ReturnType<typeof vi.spyOn> | null = null;
beforeAll(() => {
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});
afterAll(() => {
  errorSpy?.mockRestore();
  console.error = originalConsoleError;
});

// Reset mocks between tests
beforeEach(() => {
  vi.resetAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});
