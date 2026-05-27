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

class DiscordApiClient {
  declare baseUrl: string;

  private cache = new Cache<Response>();

  constructor(baseUrl = "https://discord.com/api/v10") {
    this.baseUrl = baseUrl;
  }

  async fetch(
    input: `/${string}`,
    init?: RequestInit,
    retryOptions?: RetryOptions,
  ): Promise<Response> {
    const url = new URL(`${this.baseUrl}${input}`);

    const method = init?.method ?? "GET";
    if (method !== "GET") {
      return await fetchWithRetries(url, init, retryOptions);
    }

    const cacheKey = `${url.pathname}${url.search}`;

    const isCacheHit = this.cache.has(cacheKey);
    logCacheAccess(cacheKey, isCacheHit);

    if (!isCacheHit) {
      logWithTag({ url, init, retryOptions });
      const response = await fetchWithRetries(url, init, retryOptions);
      if (!response.ok) return response;
      this.cache.set(cacheKey, response);
    }

    // biome-ignore lint/style/noNonNullAssertion: Guarded by `this.cache.has(cacheKey)`
    return this.cache.get(cacheKey)!.clone();
  }
}

const discordApi = new DiscordApiClient();

export default discordApi;
