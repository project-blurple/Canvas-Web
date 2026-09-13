import { Module } from "@nestjs/common";
import { ConfigModule as NestConfigModule } from "@nestjs/config";

import { appConfig } from "./app.config";
import { captchaConfig } from "./captcha.config";
import { databaseConfig } from "./database.config";
import { discordConfig } from "./discord.config";
import { validateEnv } from "./env";
import { framesConfig } from "./frames.config";
import { placementConfig } from "./placement.config";
import { sessionConfig } from "./session.config";
import { snapshotConfig } from "./snapshot.config";
import { telemetryConfig } from "./telemetry.config";
import { timelapseConfig } from "./timelapse.config";

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      // dotenvx (workspace standard) already loads .env in env.ts.
      ignoreEnvFile: true,
      validate: validateEnv,
      load: [
        appConfig,
        captchaConfig,
        databaseConfig,
        discordConfig,
        framesConfig,
        placementConfig,
        sessionConfig,
        snapshotConfig,
        telemetryConfig,
        timelapseConfig,
      ],
    }),
  ],
})
export class AppConfigModule {}
