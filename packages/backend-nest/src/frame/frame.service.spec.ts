import { FrameOwnerType } from "@blurple-canvas-web/types";
import { Test, type TestingModule } from "@nestjs/testing";

import { DatabaseModule } from "@/common/database/database.module";
import { ForbiddenError } from "@/common/errors/forbidden.error";
import { NotFoundError } from "@/common/errors/not-found.error";
import { UnprocessableError } from "@/common/errors/unprocessable.error";
import { AppConfigModule } from "@/config/config.module";
import { framesConfig } from "@/config/frames.config";
import { DiscordGuildService } from "@/discord/discord-guild.service";
import { testPrisma as prisma } from "@/test/database";
import { testUser1 as user } from "@/test/fixtures/users";
import { seedCanvases } from "@/test/seed/canvases";
import { seedDiscordProfiles } from "@/test/seed/discord-profiles";
import { seedEvents } from "@/test/seed/events";
import { seedGuilds } from "@/test/seed/guilds";
import { seedUsers } from "@/test/seed/users";
import { FrameService } from "./frame.service";

const ACCESS_TOKEN = "access-token";

const discordGuildService = {
  getGuildPermissionsForUser: vi.fn(async () => ({
    administrator: true,
    manage_guild: false,
  })),
};

async function createUserFrame(id: string, ownerUserId = 1n, canvasId = 1) {
  await prisma.frame.create({
    data: {
      id,
      canvasId,
      ownerUserId,
      name: `Frame ${id}`,
      x0: 0,
      y0: 0,
      x1: 1,
      y1: 1,
    },
  });
}

describe("FrameService", () => {
  let moduleRef: TestingModule;
  let service: FrameService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppConfigModule, DatabaseModule],
      providers: [
        FrameService,
        { provide: DiscordGuildService, useValue: discordGuildService },
        // Small limits make the cap assertions tractable.
        {
          provide: framesConfig.KEY,
          useValue: { maxAllowedUser: 1, maxAllowedGuild: 1 },
        },
      ],
    }).compile();
    await moduleRef.init();

    service = moduleRef.get(FrameService);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    await seedEvents();
    await seedUsers();
    await seedGuilds();
    await seedDiscordProfiles();
    await seedCanvases();
  });

  describe("getFrameById", () => {
    it("returns a user-owned frame, case-insensitively", async () => {
      await createUserFrame("abc123");

      const frame = await service.getFrameById("ABC123");
      expect(frame).toMatchObject({
        id: "abc123",
        canvasId: 1,
        width: 2,
        height: 2,
        owner: {
          type: FrameOwnerType.User,
          user: { id: "1", username: "test_user_1" },
        },
      });
    });

    it("throws NotFoundError for an unknown frame", async () => {
      await expect(service.getFrameById("ffffff")).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });
  });

  describe("getFramesByUserId / getFramesByGuildIds", () => {
    it("returns a user's frames", async () => {
      await createUserFrame("000001");
      await createUserFrame("000002");

      const frames = await service.getFramesByUserId("1", 1);
      expect(frames.map((frame) => frame.id).sort()).toEqual([
        "000001",
        "000002",
      ]);
    });

    it("returns guild-owned frames", async () => {
      await prisma.frame.create({
        data: {
          id: "0a0a0a",
          canvasId: 1,
          ownerGuildId: 1n,
          name: "Guild frame",
          x0: 0,
          y0: 0,
          x1: 1,
          y1: 1,
        },
      });

      const frames = await service.getFramesByGuildIds(["1"], 1);
      expect(frames).toHaveLength(1);
      expect(frames[0].owner).toMatchObject({
        type: FrameOwnerType.Guild,
        guild: { guild_id: "1", name: "Guild 1" },
      });
    });
  });

  describe("createFrame", () => {
    it("creates a user-owned frame with a 6-hex id", async () => {
      const frame = await service.createFrame(
        user,
        ACCESS_TOKEN,
        1,
        "My frame",
        { type: FrameOwnerType.User, id: "1" },
        0,
        0,
        1,
        1,
      );

      expect(frame.id).toMatch(/^[0-9a-f]{6}$/);
      expect(frame.ownerUserId).toBe(1n);
    });

    it("rejects creating a user frame for someone else", async () => {
      await expect(
        service.createFrame(
          user,
          ACCESS_TOKEN,
          1,
          "Nope",
          { type: FrameOwnerType.User, id: "9" },
          0,
          0,
          1,
          1,
        ),
      ).rejects.toBeInstanceOf(ForbiddenError);
    });

    it("rejects a guild frame when the user lacks permission", async () => {
      discordGuildService.getGuildPermissionsForUser.mockResolvedValueOnce({
        administrator: false,
        manage_guild: false,
      });

      await expect(
        service.createFrame(
          user,
          ACCESS_TOKEN,
          1,
          "Guild frame",
          { type: FrameOwnerType.Guild, id: "1" },
          0,
          0,
          1,
          1,
        ),
      ).rejects.toBeInstanceOf(ForbiddenError);
    });

    it("rejects out-of-bounds coordinates", async () => {
      await expect(
        service.createFrame(
          user,
          ACCESS_TOKEN,
          1,
          "Too big",
          { type: FrameOwnerType.User, id: "1" },
          0,
          0,
          99,
          99,
        ),
      ).rejects.toBeInstanceOf(Error);
    });
  });

  describe("editFrame / deleteFrame", () => {
    it("edits a frame the user owns", async () => {
      await createUserFrame("aaa111");

      const updated = await service.editFrame(
        user,
        ACCESS_TOKEN,
        "aaa111",
        "Renamed",
        0,
        0,
        1,
        1,
      );
      expect(updated).toMatchObject({ name: "Renamed", x1: 1, y1: 1 });
    });

    it("refuses to edit a frame owned by another user", async () => {
      await createUserFrame("bbb222", 9n);

      await expect(
        service.editFrame(user, ACCESS_TOKEN, "bbb222", "Hijack", 0, 0, 1, 1),
      ).rejects.toBeInstanceOf(ForbiddenError);
    });

    it("deletes a frame the user owns", async () => {
      await createUserFrame("ccc333");

      await service.deleteFrame(user, ACCESS_TOKEN, "ccc333");
      await expect(
        prisma.frame.findUnique({ where: { id: "ccc333" } }),
      ).resolves.toBeNull();
    });
  });

  describe("assertMaxOwnerFramesNotExceeded", () => {
    it("throws once the per-user limit is reached", async () => {
      await createUserFrame("d00d00");

      await expect(
        service.assertMaxOwnerFramesNotExceeded({
          canvasId: 1,
          owner: { type: FrameOwnerType.User, id: "1" },
        }),
      ).rejects.toBeInstanceOf(UnprocessableError);
    });

    it("passes when below the limit", async () => {
      await expect(
        service.assertMaxOwnerFramesNotExceeded({
          canvasId: 1,
          owner: { type: FrameOwnerType.User, id: "1" },
        }),
      ).resolves.toBeUndefined();
    });
  });
});
