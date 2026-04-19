const generatedUserCount = 20;

interface DiscordUserProfileSeedData {
  user_id: bigint;
  username: string;
  profile_picture_url: string;
}

export function discordUserProfileSeedData(): DiscordUserProfileSeedData[] {
  const users: DiscordUserProfileSeedData[] = [
    {
      user_id: 204778476102877187n,
      username: "rocked03",
      profile_picture_url:
        "https://cdn.discordapp.com/avatars/204778476102877187/5ef6b55e834e4fbd80a16ccac63b214b.webp?size=32",
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

interface UserSeedData {
  id: number;
  current_canvas_id?: number; // used by the bot, not supported in the web app
}

export function userSeedData(
  discordUsers: DiscordUserProfileSeedData[],
): UserSeedData[] {
  const users: UserSeedData[] = discordUsers.map((discordUser) => ({
    id: Number(discordUser.user_id),
  }));

  return users;
}
