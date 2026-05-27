import type { BlocklistEntry } from "@blurple-canvas-web/types";
import { prisma } from "@/client";

interface BlocklistRow {
  user_id: bigint;
  date_added: Date;
  username: string | null;
  profile_picture_url: string | null;
}

export async function getBlocklist(): Promise<BlocklistEntry[]> {
  const blocklist = await prisma.$queryRaw<BlocklistRow[]>`
    SELECT
      b.user_id,
      b.date_added,
      dup.username,
      dup.profile_picture_url
    FROM blacklist b
    LEFT JOIN discord_user_profile dup ON b.user_id = dup.user_id
    ORDER BY b.date_added DESC
  `;

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

export async function removeUsersFromBlocklist(userIds: Iterable<bigint>) {
  const userIdsArray = Array.isArray(userIds) ? userIds : Array.from(userIds);
  await prisma.blacklist.deleteMany({
    where: {
      user_id: {
        in: userIdsArray,
      },
    },
  });
}
