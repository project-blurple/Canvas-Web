import type { Prisma } from "../../common/database/generated/client";

const generatedUserCount = 20;

export function discordUserProfileSeedData(): Prisma.DiscordUserProfileCreateManyInput[] {
  const users: Prisma.DiscordUserProfileCreateManyInput[] = [
    {
      userId: 204778476102877187n,
      username: "rocked03",
      profilePictureUrl: "https://discord.com/assets/788f05731f8aa02e.png",
    },
    {
      userId: 546792825023365121n,
      username: "Blurple Canvas",
      profilePictureUrl: "https://discord.com/assets/788f05731f8aa02e.png",
    },
  ];

  for (let i = 0; i < generatedUserCount; i++) {
    const userId = BigInt(100_000 + i);
    users.push({
      userId,
      username: `User ${userId}`,
      profilePictureUrl: "https://discord.com/assets/788f05731f8aa02e.png",
    });
  }

  return users;
}

export function userSeedData(
  discordUsers: Prisma.DiscordUserProfileCreateManyInput[],
): Prisma.UserCreateManyInput[] {
  return discordUsers.map((discordUser) => ({
    id: discordUser.userId,
  }));
}
