const generatedUserCount = 20;

import type { Prisma } from "../../client/generated/client";

export function discordUserProfileSeedData(): Prisma.discord_user_profileCreateManyInput[] {
  const users: Prisma.discord_user_profileCreateManyInput[] = [
    {
      user_id: 204778476102877187n,
      username: "rocked03",
      profile_picture_url: "https://discord.com/assets/788f05731f8aa02e.png",
    },
    {
      user_id: 546792825023365121n,
      username: "Blurple Canvas",
      profile_picture_url: "https://discord.com/assets/788f05731f8aa02e.png",
    },
  ];

  for (let i = 0; i < generatedUserCount; i++) {
    const userId = BigInt(100_000 + i);
    users.push({
      user_id: userId,
      username: `User ${userId}`,
      profile_picture_url: "https://discord.com/assets/788f05731f8aa02e.png",
    });
  }

  return users;
}

export function userSeedData(
  discordUsers: Prisma.discord_user_profileCreateManyInput[],
): Prisma.userCreateManyInput[] {
  const users: Prisma.userCreateManyInput[] = discordUsers.map(
    (discordUser) => ({
      id: discordUser.user_id,
    }),
  );

  return users;
}
