import type { DiscordUserProfile } from "@blurple-canvas-web/types";
import { type discord_user_profile, prisma } from "@/client";
import { NotFoundError } from "@/errors";

export async function getDiscordProfile(
  userId: discord_user_profile["user_id"],
): Promise<discord_user_profile> {
  const discordUserProfile = await prisma.discord_user_profile.findFirst({
    where: {
      user_id: userId,
    },
  });

  if (!discordUserProfile) {
    throw new NotFoundError(`Discord profile not found for user ID ${userId}`);
  }

  return discordUserProfile;
}

export async function createOrUpdateDiscordProfile(
  profile: discord_user_profile,
): Promise<void> {
  await prisma.discord_user_profile.upsert({
    where: {
      user_id: profile.user_id,
    },
    update: profile,
    create: profile,
  });
}

export function createDefaultAvatarUrl(userId: bigint): string {
  const BIT_SHIFT_VALUE = 22n;
  const NUMBER_OF_AVATARS = 6n;
  const avatarId = (userId >> BIT_SHIFT_VALUE) % NUMBER_OF_AVATARS;

  return `https://cdn.discordapp.com/embed/avatars/${avatarId}.png`;
}

export function getProfilePictureUrlFromHash(
  userId: discord_user_profile["user_id"],
  profilePictureHash: string | null,
): string {
  if (!profilePictureHash) {
    return createDefaultAvatarUrl(userId);
  }

  return createCustomAvatarUrl(userId, profilePictureHash);
}

export function createCustomAvatarUrl(
  userId: discord_user_profile["user_id"],
  profilePictureHash: string,
): string {
  return `https://cdn.discordapp.com/avatars/${userId}/${profilePictureHash}.png`;
}

export async function saveDiscordProfile(
  profile: DiscordUserProfile,
): Promise<void> {
  await createOrUpdateDiscordProfile({
    user_id: BigInt(profile.id),
    username: profile.username,
    profile_picture_url: profile.profilePictureUrl,
  });
}
