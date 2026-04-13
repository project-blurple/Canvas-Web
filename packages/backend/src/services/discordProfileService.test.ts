import { prisma } from "@/client";
import { seedDiscordProfiles } from "@/test";
import {
  createCustomAvatarUrl,
  createDefaultAvatarUrl,
  createOrUpdateDiscordProfile,
  getDiscordProfile,
  saveDiscordProfile,
} from "./discordProfileService";

describe("discordProfileService", () => {
  beforeEach(async () => {
    await seedDiscordProfiles();
  });

  describe("getDiscordProfile", () => {
    it("should return the Discord profile for a given user ID", async () => {
      const userId = 204778476102877187n;
      const expectedProfile = {
        user_id: BigInt(204778476102877187n),
        username: "rocked03",
        profile_picture_url:
          "https://cdn.discordapp.com/avatars/204778476102877187/f4468ea05fa0dada4e3a3fbe18b748fe.png",
      };

      const profile = await getDiscordProfile(userId);

      expect(profile).toEqual(expectedProfile);
    });
  });

  describe("createOrUpdateDiscordProfile", () => {
    it("should create a discord profile", async () => {
      const profile = {
        user_id: 111111111111111111n,
        username: "test_user",
        profile_picture_url:
          "https://cdn.discordapp.com/avatars/204778476102877187/f4468ea05fa0dada4e3a3fbe18b748fe.png",
      };

      await createOrUpdateDiscordProfile(profile);

      const createdProfile = await prisma.discord_user_profile.findUnique({
        where: { user_id: 111111111111111111n },
      });

      expect(createdProfile).toEqual(profile);
    });

    it("should update a discord profile", async () => {
      const profile = {
        user_id: 204778476102877187n,
        username: "rocked314",
        profile_picture_url:
          "https://cdn.discordapp.com/avatars/204778476102877187/f4468ea05fa0dada4e3a3fbe18b748fe.png",
      };

      await createOrUpdateDiscordProfile(profile);

      const updatedProfile = await prisma.discord_user_profile.findUnique({
        where: { user_id: 204778476102877187n },
      });

      expect(updatedProfile).toEqual(profile);
    });
  });

  describe("createDefaultAvatarUrl", () => {
    it("should create a default avatar URL for a given user ID", () => {
      const userId = 111111111111111111n;
      const expectedUrl = "https://cdn.discordapp.com/embed/avatars/1.png";

      const url = createDefaultAvatarUrl(userId);

      expect(url).toEqual(expectedUrl);
    });
  });

  describe("createCustomAvatarUrl", () => {
    it("should create a custom avatar URL for a given user ID and profile picture hash", () => {
      const userId = 204778476102877187n;
      const profilePictureHash = "f4468ea05fa0dada4e3a3fbe18b748fe";
      const expectedUrl =
        "https://cdn.discordapp.com/avatars/204778476102877187/f4468ea05fa0dada4e3a3fbe18b748fe.png";

      const url = createCustomAvatarUrl(userId, profilePictureHash);

      expect(url).toEqual(expectedUrl);
    });
  });

  describe("saveDiscordProfile", () => {
    it("should save the discord profile for a given user ID, username, and profile picture URL", async () => {
      const id = "228441721246056449";
      const username = "jasperlai";
      const profilePictureUrl =
        "https://cdn.discordapp.com/avatars/228441721246056449/67384b584aa7b9145ebb4028ff697931.png";

      await saveDiscordProfile({ id, username, profilePictureUrl });

      const savedProfile = await prisma.discord_user_profile.findUnique({
        where: { user_id: 228441721246056449n },
      });

      expect(savedProfile).toEqual({
        user_id: 228441721246056449n,
        username: "jasperlai",
        profile_picture_url:
          "https://cdn.discordapp.com/avatars/228441721246056449/67384b584aa7b9145ebb4028ff697931.png",
      });
    });
  });
});
