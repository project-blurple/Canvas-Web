import { afterAll, afterEach, beforeAll, beforeEach, vi } from "vitest";

vi.mock("@/config/clientConfig", () => ({
  __esModule: true,
  default: {
    apiUrl: "http://localhost:8000",
    discordServerInvite: "https://projectblurple.com",
    showBotCommands: false,
  },
}));

// Provide a basic localStorage mock if not present
if (typeof window !== "undefined" && !window.localStorage) {
  const storage: Record<string, string> = {};
  Object.defineProperty(window, "localStorage", {
    value: {
      getItem: (key: string) => (key in storage ? storage[key] : null),
      setItem: (key: string, value: string) => {
        storage[key] = String(value);
      },
      removeItem: (key: string) => {
        delete storage[key];
      },
      clear: () => {
        for (const k of Object.keys(storage)) delete storage[k];
      },
    },
  });
}

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

// Reset DOM and mocks between tests
beforeEach(() => {
  vi.resetAllMocks();
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      window.localStorage.clear();
    } catch {
      // ignore
    }
  }
  if (typeof document !== "undefined") document.body.innerHTML = "";
});

afterEach(() => {
  vi.restoreAllMocks();
});
