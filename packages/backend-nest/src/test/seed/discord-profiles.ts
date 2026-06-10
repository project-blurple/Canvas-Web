import { testPrisma as prisma } from "../database";

export async function seedDiscordProfiles() {
  await prisma.discordUserProfile.createMany({
    data: [
      {
        userId: 1n,
        username: "test_user_1",
        profilePictureUrl: "https://example.com/avatar1.png",
      },
      {
        userId: 9n,
        username: "test_user_9",
        profilePictureUrl: "https://example.com/avatar9.png",
      },
      {
        userId: 204778476102877187n,
        username: "rocked03",
        profilePictureUrl:
          "https://cdn.discordapp.com/avatars/204778476102877187/f4468ea05fa0dada4e3a3fbe18b748fe.png",
      },
      {
        userId: 201892070091128832n,
        username: "polarwolf314",
        profilePictureUrl:
          "https://cdn.discordapp.com/avatars/201892070091128832/ef960949b260ce193b249710bb8c7a79.png",
      },
    ],
  });
}
