import type { BlocklistEntry } from "@blurple-canvas-web/types";
import { prisma } from "@/client";

export async function getBlocklist(): Promise<BlocklistEntry[]> {
  const blocklist = await prisma.blacklist.findMany({
    select: {
      user_id: true,
      date_added: true,
      discord_user_profile: {
        select: {
          username: true,
          profile_picture_url: true,
        },
      },
    },
  });

  return blocklist.map((entry) => ({
    userId: entry.user_id,
    dateAdded: entry.date_added,
    username: entry.discord_user_profile?.username ?? null,
    profilePictureUrl: entry.discord_user_profile?.profile_picture_url ?? null,
  }));
}

export async function userIsBlocklisted(
  userId: BlocklistEntry["userId"],
): Promise<boolean> {
  const blocklistEntry = await prisma.blacklist.findFirst({
    where: {
      user_id: userId,
    },
  });
  return !!blocklistEntry;
}

export async function addUsersToBlocklist(
  userIds: Iterable<BlocklistEntry["userId"]>,
) {
  const userIdsArray = Array.isArray(userIds) ? userIds : Array.from(userIds);
  return await prisma.blacklist.createManyAndReturn({
    data: userIdsArray.map((userId) => ({
      user_id: userId,
    })),
    skipDuplicates: true,
  });
}

export async function removeUsersFromBlocklist(
  userIds: Iterable<BlocklistEntry["userId"]>,
) {
  await prisma.blacklist.deleteMany({
    where: {
      user_id: {
        in: Array.isArray(userIds) ? userIds : Array.from(userIds),
      },
    },
  });
}
