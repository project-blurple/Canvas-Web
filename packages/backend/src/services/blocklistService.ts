import type { BlocklistEntry } from "@blurple-canvas-web/types";
import { Prisma, prisma } from "@/client";
import BadRequestError from "@/errors/BadRequestError";
import { PrismaErrorCode } from "@/utils";

export async function getBlocklist() {
  return await prisma.blacklist.findMany({
    select: {
      user_id: true,
      date_added: true,
    },
  });
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
  userIds: BlocklistEntry["userId"][],
  ignoreDuplicates = false,
) {
  try {
    await prisma.blacklist.createMany({
      data: userIds.map((userId) => ({
        user_id: userId,
      })),
      skipDuplicates: ignoreDuplicates,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === PrismaErrorCode.UniqueConstraintViolation
    ) {
      throw new BadRequestError("User is already in the blocklist");
    }
    throw error;
  }
}

export async function removeUsersFromBlocklist(
  userIds: BlocklistEntry["userId"][],
) {
  await prisma.blacklist.deleteMany({
    where: {
      user_id: {
        in: userIds,
      },
    },
  });
}
