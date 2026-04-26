import type { BlacklistEntry } from "@blurple-canvas-web/types";
import { Prisma, prisma } from "@/client";
import BadRequestError from "@/errors/BadRequestError";
import { PrismaErrorCode } from "@/utils";

export async function getBlacklist() {
  return await prisma.blacklist.findMany({
    select: {
      user_id: true,
      date_added: true,
    },
  });
}

export async function checkIfUserIsBlacklisted(
  userId: BlacklistEntry["userId"],
): Promise<boolean> {
  const blacklistEntry = await prisma.blacklist.findFirst({
    where: {
      user_id: userId,
    },
  });
  return !!blacklistEntry;
}

export async function addUsersToBlacklist(
  userIds: BlacklistEntry["userId"][],
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
      throw new BadRequestError("User is already in the blacklist");
    }
    throw error;
  }
}

export async function removeUsersFromBlacklist(
  userIds: BlacklistEntry["userId"][],
) {
  await prisma.blacklist.deleteMany({
    where: {
      user_id: {
        in: userIds,
      },
    },
  });
}
