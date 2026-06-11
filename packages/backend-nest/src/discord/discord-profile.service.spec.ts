import { Test, type TestingModule } from "@nestjs/testing";

import { DatabaseModule } from "@/common/database/database.module";
import { NotFoundError } from "@/common/errors/not-found.error";
import { AppConfigModule } from "@/config/config.module";
import { DiscordProfileService } from "@/discord/discord-profile.service";
import { DiscordModule } from "@/discord/discord.module";
import { testPrisma as prisma } from "@/test/database";
import { seedDiscordProfiles } from "@/test/seed/discord-profiles";
import { seedUsers } from "@/test/seed/users";

describe("DiscordProfileService", () => {
  let moduleRef: TestingModule;
  let service: DiscordProfileService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppConfigModule, DatabaseModule, DiscordModule],
    }).compile();
    await moduleRef.init();

    service = moduleRef.get(DiscordProfileService);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  beforeEach(async () => {
    await seedUsers();
    await seedDiscordProfiles();
  });

  describe("getDiscordProfile", () => {
    it("returns the Discord profile for a given user ID", async () => {
      const profile = await service.getDiscordProfile(204778476102877187n);

      expect(profile).toEqual({
        userId: 204778476102877187n,
        username: "rocked03",
        profilePictureUrl:
          "https://cdn.discordapp.com/avatars/204778476102877187/f4468ea05fa0dada4e3a3fbe18b748fe.png",
      });
    });

    it("throws NotFoundError for an unknown user ID", async () => {
      await expect(
        service.getDiscordProfile(999999999999999999n),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("createOrUpdateDiscordProfile", () => {
    it("creates a discord profile", async () => {
      const profile = {
        userId: 111111111111111111n,
        username: "test_user",
        profilePictureUrl:
          "https://cdn.discordapp.com/avatars/204778476102877187/f4468ea05fa0dada4e3a3fbe18b748fe.png",
      };

      await service.createOrUpdateDiscordProfile(profile);

      const createdProfile = await prisma.discordUserProfile.findUnique({
        where: { userId: 111111111111111111n },
      });

      expect(createdProfile).toEqual(profile);
    });

    it("updates a discord profile", async () => {
      const profile = {
        userId: 204778476102877187n,
        username: "rocked314",
        profilePictureUrl:
          "https://cdn.discordapp.com/avatars/204778476102877187/f4468ea05fa0dada4e3a3fbe18b748fe.png",
      };

      await service.createOrUpdateDiscordProfile(profile);

      const updatedProfile = await prisma.discordUserProfile.findUnique({
        where: { userId: 204778476102877187n },
      });

      expect(updatedProfile).toEqual(profile);
    });
  });

  describe("createDefaultAvatarUrl", () => {
    it("creates a default avatar URL for a given user ID", () => {
      const url = service.createDefaultAvatarUrl(111111111111111111n);

      expect(url).toEqual("https://cdn.discordapp.com/embed/avatars/1.png");
    });
  });

  describe("createCustomAvatarUrl", () => {
    it("creates a custom avatar URL for a given user ID and profile picture hash", () => {
      const url = service.createCustomAvatarUrl(
        204778476102877187n,
        "f4468ea05fa0dada4e3a3fbe18b748fe",
      );

      expect(url).toEqual(
        "https://cdn.discordapp.com/avatars/204778476102877187/f4468ea05fa0dada4e3a3fbe18b748fe.png",
      );
    });
  });

  describe("saveDiscordProfile", () => {
    it("saves the discord profile for a given user ID, username, and profile picture URL", async () => {
      await service.saveDiscordProfile({
        id: "228441721246056449",
        username: "rocked03",
        profilePictureUrl:
          "https://cdn.discordapp.com/avatars/228441721246056449/67384b584aa7b9145ebb4028ff697931.png",
      });

      const savedProfile = await prisma.discordUserProfile.findUnique({
        where: { userId: 228441721246056449n },
      });

      expect(savedProfile).toEqual({
        userId: 228441721246056449n,
        username: "rocked03",
        profilePictureUrl:
          "https://cdn.discordapp.com/avatars/228441721246056449/67384b584aa7b9145ebb4028ff697931.png",
      });
    });
  });
});
