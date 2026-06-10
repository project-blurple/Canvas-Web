import { Module } from "@nestjs/common";

import { AppConfigModule } from "@/config";

@Module({
  imports: [AppConfigModule],
})
export class AppModule {}
