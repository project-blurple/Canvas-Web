import { styleText } from "node:util";
import Cache from "@/app/Cache";
import fetchWithRetries, { type RetryOptions } from "@/utils/fetchWithRetries";

function logWithTag(...args: Parameters<typeof console.debug>) {
  console.debug(styleText(["dim"], "[DiscordApiClient]"), ...args);
}

function logCacheAccess(cacheKey: string, hit: boolean) {
  const color = hit ? "green" : "yellow";
  const hitOrMiss = hit ? "HIT" : "MISS";
  logWithTag(
    "Cache",
    styleText(["bold", color], hitOrMiss),
    "for",
    styleText(["italic"], cacheKey),
  );
}

function sanitizeRequestInit(requestInit: RequestInit): RequestInit {
  const headersInit = requestInit.headers;
  if (headersInit === undefined) return requestInit;
  const headers = new Headers(headersInit);
  headers.delete("Authorization");
  return { ...requestInit, headers };
}

/** @privateRemarks We only ever expect Bearer scheme, but this will also work with Basic auth */
function getAuthToken(authHeader: string) {
  const [, token] = authHeader.split(/\s/);
  return token;
}

class DiscordApiClient {
  declare baseUrl: string;

  private cache = new Cache<Response>();

  constructor(baseUrl = "https://discord.com/api/v10") {
    this.baseUrl = baseUrl;
  }

  async fetch(
    input: `/${string}`,
    init?: RequestInit,
    options?: { retryOptions?: RetryOptions; staleTime?: number },
  ): Promise<Response> {
    const url = new URL(`${this.baseUrl}${input}`);
    const { retryOptions, staleTime } = options ?? {};

    const method = init?.method ?? "GET";
    if (method !== "GET") {
      return await fetchWithRetries(url, init, retryOptions);
    }

    const userScope = getAuthToken(
      new Headers(init?.headers).get("Authorization"),
    );
    const cacheKey = `${url.pathname}${url.search}\u{200D}${userScope}`;

    const isCacheHit = this.cache.has(cacheKey);
    logCacheAccess(cacheKey, isCacheHit);

    if (!isCacheHit) {
      logWithTag({
        url: url.toString(),
        init: init ? sanitizeRequestInit(init) : init,
        retryOptions,
      });
      const response = await fetchWithRetries(url, init, retryOptions);
      // 💡 Response body is single use! If logging response body, make sure to clone response
      if (!response.ok) return response;
      this.cache.set(cacheKey, response, staleTime);
    }

    // biome-ignore lint/style/noNonNullAssertion: Guarded by `this.cache.has(cacheKey)`
    return this.cache.get(cacheKey)!.clone();
  }
}

const discordApi = new DiscordApiClient();

export default discordApi;
