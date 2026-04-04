import { prisma } from "@/client";

export default async function seedDiscordProfiles() {
  try {
    await prisma.discord_user_profile.createMany({
      data: [
        {
          user_id: 204778476102877187n,
          username: "rocked03",
          profile_picture_url:
            "https://cdn.discordapp.com/avatars/204778476102877187/f4468ea05fa0dada4e3a3fbe18b748fe.png",
        },
        {
          user_id: 201892070091128832n,
          username: "polarwolf314",
          profile_picture_url:
            "https://cdn.discordapp.com/avatars/201892070091128832/ef960949b260ce193b249710bb8c7a79.png",
        },
      ],
    });
  } catch (error) {
    console.error(error);
  }
}
