import { testPrisma as prisma } from "../database";

export async function seedBlacklist() {
  await prisma.blacklist.create({
    data: {
      userId: 9,
      dateAdded: new Date(0),
    },
  });
}
