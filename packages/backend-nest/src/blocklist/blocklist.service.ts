import type { BlocklistEntry } from "@blurple-canvas-web/types";
import { Injectable } from "@nestjs/common";

import { PixelReconciliationService } from "@/canvas/pixel-reconciliation.service";
import { PrismaService } from "@/common/database/prisma.service";

@Injectable()
export class BlocklistService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pixelReconciliationService: PixelReconciliationService,
  ) {}

  async userIsBlocklisted(userId: bigint): Promise<boolean> {
    const blocklistEntry = await this.prisma.blacklist.findFirst({
      where: { userId },
    });

    return !!blocklistEntry;
  }

  /** Lists every blocklisted user, most recently added first. */
  async getBlocklist(): Promise<BlocklistEntry[]> {
    const blocklist = await this.prisma.$kysely
      .selectFrom("blacklist")
      .leftJoin(
        "discordUserProfile",
        "discordUserProfile.userId",
        "blacklist.userId",
      )
      .select([
        "blacklist.userId",
        "blacklist.dateAdded",
        "discordUserProfile.username",
        "discordUserProfile.profilePictureUrl",
      ])
      .orderBy("blacklist.dateAdded", "desc")
      .execute();

    return blocklist.map((entry) => ({
      userId: entry.userId.toString(),
      dateAdded: entry.dateAdded.toISOString(),
      username: entry.username,
      profilePictureUrl: entry.profilePictureUrl,
    }));
  }

  /** Adds the given users to the blocklist, skipping duplicates. */
  async addUsersToBlocklist(userIds: Iterable<bigint>) {
    const userIdsArray = Array.isArray(userIds) ? userIds : Array.from(userIds);

    return await this.prisma.blacklist.createManyAndReturn({
      data: userIdsArray.map((userId) => ({ userId })),
      skipDuplicates: true,
    });
  }

  /**
   * Removes the given users from the blocklist. When
   * `shouldRestoreHistoryForCanvasId` is non-empty, their soft-erased history
   * on those canvases is restored first (pixels rebuilt).
   */
  async removeUsersFromBlocklist(
    userIds: Iterable<bigint>,
    shouldRestoreHistoryForCanvasId: number[] = [],
  ): Promise<void> {
    const userIdsArray = Array.isArray(userIds) ? userIds : Array.from(userIds);

    if (shouldRestoreHistoryForCanvasId.length > 0 && userIdsArray.length > 0) {
      await this.pixelReconciliationService.restoreErasedHistory(
        userIdsArray,
        shouldRestoreHistoryForCanvasId,
      );
    }

    await this.prisma.blacklist.deleteMany({
      where: { userId: { in: userIdsArray } },
    });
  }
}
