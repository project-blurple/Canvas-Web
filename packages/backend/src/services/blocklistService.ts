import type { BlocklistEntry } from "@blurple-canvas-web/types";
import { prisma } from "@/client";

/**
 * Gets the blocklist entries *
 * @returns An array of blocklist entries
 */
export async function getBlocklist() {
  return await prisma.blacklist.findMany({
    select: {
      user_id: true,
      date_added: true,
    },
  });
}

/**
 * Checks if a user is blocklisted
 *
 * @param userId - The ID of the user to check
 * @returns True if the user is blocklisted, false otherwise
 */
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

/**
 * Adds users to the blocklist
 *
 * @param userIds - The IDs of the users to add to the blocklist
 * @returns An array of the added blocklist entries
 */
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

/**
 * Removes users from the blocklist
 *
 * @param userIds - The IDs of the users to remove from the blocklist
 */
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
