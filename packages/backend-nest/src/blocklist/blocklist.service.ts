import { Injectable } from "@nestjs/common";

import { PrismaService } from "@/common/database/prisma.service";

@Injectable()
export class BlocklistService {
  constructor(private readonly prisma: PrismaService) {}

  async userIsBlocklisted(userId: bigint): Promise<boolean> {
    const blocklistEntry = await this.prisma.blacklist.findFirst({
      where: { userId },
    });

    return !!blocklistEntry;
  }
}
