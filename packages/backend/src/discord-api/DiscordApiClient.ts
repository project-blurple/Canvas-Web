import { styleText } from "node:util";
import Cache from "@/app/Cache";
import fetchWithRetries, { type RetryOptions } from "@/utils/fetchWithRetries";

function logWithTag(...args: Parameters<typeof console.debug>) {
  console.debug(styleText(["dim"], "[DiscordApiClient]"), ...args);
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

    if (!this.cache.has(cacheKey)) {
      logWithTag(
        "Cache",
        styleText(["bold", "yellow"], "MISS"),
        "for",
        styleText(["italic"], cacheKey),
      );
      logWithTag({ url, init, retryOptions });
      const response = await fetchWithRetries(url, init, retryOptions);
      return response;
    }

    logWithTag(
      "Cache",
      styleText(["bold", "green"], "HIT"),
      "for",
      styleText(["italic"], cacheKey),
    );
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
