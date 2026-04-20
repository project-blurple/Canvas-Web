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

interface UserSeedData {
  id: bigint;
  /** @privateRemarks Used by the bot to track which canvas a user is currently active on, not supported in the web app */
  current_canvas_id?: number;
}

export function userSeedData(
  discordUsers: DiscordUserProfileSeedData[],
): UserSeedData[] {
  const users: UserSeedData[] = discordUsers.map((discordUser) => ({
    id: discordUser.user_id,
  }));

  return users;
}
