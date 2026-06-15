/** Reflector metadata key for the rate-limit bucket a route belongs to. */
export const RATE_LIMIT_BUCKET = "rate-limit:bucket";

export const RATE_LIMITS = {
  pixelPlacement: { ttl: 30_000, limit: 3, bucket: "pixel-placement" },
  frameMutation: { ttl: 60_000, limit: 10, bucket: "frame-mutation" },
  guildRefresh: { ttl: 60_000, limit: 3, bucket: "guild-refresh" },
  historyQuery: {
    ttl: 24 * 60 * 60 * 1000,
    limit: 2000,
    bucket: "history-query",
  },
} as const satisfies Record<
  string,
  { ttl: number; limit: number; bucket: string }
>;
