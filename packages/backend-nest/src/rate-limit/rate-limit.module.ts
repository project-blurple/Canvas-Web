import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerModule } from "@nestjs/throttler";

import { RATE_LIMITS } from "./rate-limit.constants";
import { UserOrIpThrottlerGuard } from "./user-or-ip-throttler.guard";

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [
        {
          name: "default",
          ttl: RATE_LIMITS.pixelPlacement.ttl,
          limit: RATE_LIMITS.pixelPlacement.limit,
        },
      ],
      errorMessage: "You have been rate limited",
    }),
  ],
  providers: [{ provide: APP_GUARD, useClass: UserOrIpThrottlerGuard }],
})
export class RateLimitModule {}
