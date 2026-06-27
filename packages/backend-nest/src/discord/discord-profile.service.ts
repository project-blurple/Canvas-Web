import type { DiscordUserProfile } from "@blurple-canvas-web/types";
import { Injectable } from "@nestjs/common";

import type { DiscordUserProfile as DiscordUserProfileModel } from "@/common/database/core/prisma.client";
import { PrismaService } from "@/common/database/core/prisma.service";
import { NotFoundError } from "@/common/errors/not-found.error";

@Injectable()
export class DiscordProfileService {
  constructor(private readonly prisma: PrismaService) {}

  createDefaultAvatarUrl(userId: bigint): string {
    const BIT_SHIFT_VALUE = 22n;
    const NUMBER_OF_AVATARS = 6n;
    const avatarId = (userId >> BIT_SHIFT_VALUE) % NUMBER_OF_AVATARS;

    return `https://cdn.discordapp.com/embed/avatars/${avatarId}.png`;
  }

  createCustomAvatarUrl(userId: bigint, profilePictureHash: string): string {
    return `https://cdn.discordapp.com/avatars/${userId}/${profilePictureHash}.png`;
  }

  getProfilePictureUrlFromHash(
    userId: bigint,
    profilePictureHash: string | null,
  ): string {
    if (!profilePictureHash) {
      return this.createDefaultAvatarUrl(userId);
    }

    return this.createCustomAvatarUrl(userId, profilePictureHash);
  }

  async getDiscordProfile(userId: bigint): Promise<DiscordUserProfileModel> {
    const discordUserProfile = await this.prisma.discordUserProfile.findFirst({
      where: { userId },
    });

    if (!discordUserProfile) {
      throw new NotFoundError(
        `Discord profile not found for user ID ${userId}`,
      );
    }

    return discordUserProfile;
  }

  async createOrUpdateDiscordProfile(
    profile: DiscordUserProfileModel,
  ): Promise<void> {
    await this.prisma.discordUserProfile.upsert({
      where: {
        userId: profile.userId,
      },
      update: {
        username: profile.username,
        profilePictureUrl: profile.profilePictureUrl,
      },
      create: {
        username: profile.username,
        profilePictureUrl: profile.profilePictureUrl,
        user: {
          connectOrCreate: {
            where: {
              id: profile.userId,
            },
            create: {
              id: profile.userId,
            },
          },
        },
      },
    });
  }

  async saveDiscordProfile(profile: DiscordUserProfile): Promise<void> {
    await this.createOrUpdateDiscordProfile({
      userId: BigInt(profile.id),
      username: profile.username,
      profilePictureUrl: profile.profilePictureUrl,
    });
  }
}
