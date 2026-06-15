import { applyDecorators, SetMetadata } from "@nestjs/common";
import { ApiTooManyRequestsResponse } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";

import { ErrorResponseDto } from "@/common/error-response.dto";
import { RATE_LIMIT_BUCKET, RATE_LIMITS } from "./rate-limit.constants";

function rateLimit(config: {
  ttl: number;
  limit: number;
  bucket: string;
}): MethodDecorator & ClassDecorator {
  const { ttl, limit, bucket } = config;
  return applyDecorators(
    SetMetadata(RATE_LIMIT_BUCKET, bucket),
    Throttle({ default: { ttl, limit } }),
    ApiTooManyRequestsResponse({
      type: ErrorResponseDto,
      description: "Rate limited. Please try again later.",
    }),
  );
}

/** 3 requests / 30s on web pixel placement. */
export const PixelPlacementRateLimit = () =>
  rateLimit(RATE_LIMITS.pixelPlacement);

/** 10 requests / 60s shared across frame create, edit and delete. */
export const FrameMutationRateLimit = () =>
  rateLimit(RATE_LIMITS.frameMutation);

/** 3 requests / 60s on the Discord guild-membership refresh. */
export const GuildRefreshRateLimit = () => rateLimit(RATE_LIMITS.guildRefresh);

/** 2000 requests / 24h on pixel-history retrieval. */
export const HistoryQueryRateLimit = () => rateLimit(RATE_LIMITS.historyQuery);
