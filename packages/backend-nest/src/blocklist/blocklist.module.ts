import { Module } from "@nestjs/common";

import { BlocklistService } from "./blocklist.service";

@Module({
  providers: [BlocklistService],
  exports: [BlocklistService],
})
export class BlocklistModule {}
