import type { BlocklistEntry } from "@blurple-canvas-web/types";
import { prisma } from "@/client";
import { restorePixelHistoryEntries } from "./historyService";

export async function getBlocklist(): Promise<BlocklistEntry[]> {
  const blocklist = await prisma.$kysely
    .selectFrom("blacklist")
    .leftJoin(
      "discord_user_profile",
      "discord_user_profile.user_id",
      "blacklist.user_id",
    )
    .select((eb) => [
      "blacklist.user_id",
      "blacklist.date_added",
      "discord_user_profile.username",
      "discord_user_profile.profile_picture_url",
    ])
    .orderBy("blacklist.date_added", "desc")
    .execute();

  return blocklist.map((entry) => ({
    userId: entry.user_id.toString(),
    dateAdded: entry.date_added.toISOString(),
    username: entry.username,
    profilePictureUrl: entry.profile_picture_url,
  }));
}

export async function userIsBlocklisted(userId: bigint): Promise<boolean> {
  const blocklistEntry = await prisma.blacklist.findFirst({
    where: {
      user_id: userId,
    },
  });
  return !!blocklistEntry;
}

export async function addUsersToBlocklist(userIds: Iterable<bigint>) {
  const userIdsArray = Array.isArray(userIds) ? userIds : Array.from(userIds);
  return await prisma.blacklist.createManyAndReturn({
    data: userIdsArray.map((userId) => ({
      user_id: userId,
    })),
    skipDuplicates: true,
  });
}

export async function removeUsersFromBlocklist(
  userIds: Iterable<bigint>,
  shouldRestoreHistoryForCanvasId: number[] = [],
) {
  const userIdsArray = Array.isArray(userIds) ? userIds : Array.from(userIds);

  if (shouldRestoreHistoryForCanvasId.length > 0 && userIdsArray.length > 0) {
    await restorePixelHistoryEntries(
      userIdsArray,
      shouldRestoreHistoryForCanvasId,
    );
  }

  await prisma.blacklist.deleteMany({
    where: {
      user_id: {
        in: userIdsArray,
      },
    },
  });
}
