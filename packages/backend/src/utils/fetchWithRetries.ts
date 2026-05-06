import { NotAcceptableError } from "@/errors";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface RetryOptions {
  maxAttempts: number;
  /**
   * If the response has no `Retry-After` or `X-Ratelimit-Reset-After` header, will retry with delay
   * of `attemptNumber ** backoff` seconds. (Attempt number starts from 0.) Must be at least 1.
   */
  backoff: number;
  /** Retry only with these HTTP status codes. */
  statusCodes: Set<number>;
}

const defaultRetryConfig = {
  maxAttempts: 3,
  backoff: 1.25,
  statusCodes: new Set([
    408, // Request Timeout
    409, // Conflict
    425, // Too Early
    429, // Too Many Requests
    500, // Internal Server Error
    502, // Bad Gateway
    503, // Service Unavailable
    504, // Gateway Timeout
  ]),
} as const;

export default async function fetchWithRetries(
  input: string | URL | Request,
  init?: RequestInit,
  { maxAttempts, backoff, statusCodes }: RetryOptions = defaultRetryConfig,
) {
  if (process.env.NODE_ENV !== "production" && backoff < 1) {
    throw new NotAcceptableError(
      `RetryOptions backoff must be ≥1.0, but got ${backoff}`,
    );
  }

  let response: Response;
  for (let i = 0; i < maxAttempts; i++) {
    response = await fetch(input, init);

    if (response.ok || !statusCodes.has(response.status)) return response;

    const retryAfter =
      response.headers.get("retry-after") ||
      response.headers.get("x-ratelimit-reset-after");
    const waitSeconds = retryAfter ? Number.parseFloat(retryAfter) : Number.NaN;

    await sleep(
      Number.isFinite(waitSeconds) ?
        // When available, prefer stand-down period from response header…
        waitSeconds * 1000
        // …otherwise use exponential backoff
      : backoff ** i * 1000,
    );
  }

  // @ts-expect-error Definitely initialised
  return response;
}
