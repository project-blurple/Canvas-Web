import { NotAcceptableError } from "@/common/errors/not-acceptable.error";
import { fetchWithRetries } from "./fetch-with-retries";

function jsonResponse(status: number, headers?: Record<string, string>) {
  return new Response("{}", { status, headers });
}

describe("fetchWithRetries", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("returns the first successful response without retrying", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200));

    const response = await fetchWithRetries("https://example.com");

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not retry non-retryable error statuses", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(404));

    const response = await fetchWithRetries("https://example.com");

    expect(response.status).toBe(404);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries retryable statuses with exponential backoff", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(503))
      .mockResolvedValueOnce(jsonResponse(503))
      .mockResolvedValueOnce(jsonResponse(200));

    const responsePromise = fetchWithRetries("https://example.com");

    // First retry waits backoff ** 0 = 1 s, second waits backoff ** 1 = 1.25 s.
    await vi.advanceTimersByTimeAsync(1000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1250);

    const response = await responsePromise;
    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("prefers the Retry-After header over backoff", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(429, { "retry-after": "2.5" }))
      .mockResolvedValueOnce(jsonResponse(200));

    const responsePromise = fetchWithRetries("https://example.com");

    await vi.advanceTimersByTimeAsync(2499);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);

    const response = await responsePromise;
    expect(response.status).toBe(200);
  });

  it("falls back to the X-Ratelimit-Reset-After header", async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse(429, { "x-ratelimit-reset-after": "3" }),
      )
      .mockResolvedValueOnce(jsonResponse(200));

    const responsePromise = fetchWithRetries("https://example.com");

    await vi.advanceTimersByTimeAsync(3000);

    const response = await responsePromise;
    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("returns the last failing response once attempts are exhausted", async () => {
    fetchMock.mockResolvedValue(jsonResponse(500));

    const responsePromise = fetchWithRetries("https://example.com");

    await vi.advanceTimersByTimeAsync(10_000);

    const response = await responsePromise;
    expect(response.status).toBe(500);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("rejects a backoff below 1 outside production", async () => {
    await expect(
      fetchWithRetries("https://example.com", undefined, {
        maxAttempts: 3,
        backoff: 0.5,
        statusCodes: new Set([500]),
      }),
    ).rejects.toBeInstanceOf(NotAcceptableError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
