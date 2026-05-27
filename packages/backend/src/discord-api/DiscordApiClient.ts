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

  private cache = new Cache();

  constructor(baseUrl = "https://discord.com/api/v10") {
    this.baseUrl = baseUrl;
  }

  async fetch(
    input: string,
    init?: RequestInit,
    retryOptions?: RetryOptions,
  ): Promise<Response> {
    const url = new URL(input, this.baseUrl);

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
      return response;
    }

    const body = JSON.stringify(this.cache.get(cacheKey));
    const options = {
      headers: {
        "content-type": "application/json",
      },
    };

    return new Response(body, options);
  }
}

const discordApi = new DiscordApiClient();

export default discordApi;
