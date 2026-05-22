import { FrameOwnerType } from "@blurple-canvas-web/types";
import { prisma } from "@/client";
import { NotFoundError } from "@/errors";
import { getFrameById } from "./frameService";

describe("frameService.getFrameById", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("finds frame case-insensitively and maps user owner", async () => {
    const storedId = "a1b2c3";
    const queryId = "A1B2C3";

    const frameRecord = {
      id: storedId,
      canvas_id: 1,
      owner_user_id: BigInt(123),
      owner_guild_id: null,
      name: "My Frame",
      x_0: 0,
      y_0: 0,
      x_1: 1,
      y_1: 1,
      style_id: null,
    };

    const userRecord = {
      user_id: BigInt(123),
      username: "tester",
      profile_picture_url: "http://example.test/avatar.png",
    };

    const findFirstSpy = vi
      .spyOn(prisma.frame, "findFirst")
      .mockResolvedValue(frameRecord);

    vi.spyOn(prisma.discord_user_profile, "findMany").mockResolvedValue([
      userRecord,
    ]);
    vi.spyOn(prisma.discord_guild_record, "findMany").mockResolvedValue([]);

    const result = await getFrameById(queryId);

    expect(findFirstSpy).toHaveBeenCalled();
    const calledArg = findFirstSpy.mock.calls[0][0];
    if (!calledArg?.where) {
      throw new Error("Expected prisma.frame.findFirst to be called with args");
    }

    expect(calledArg.where.id).toEqual({
      equals: queryId,
      mode: "insensitive",
    });

    expect(result.id).toBe(storedId);
    function isUserOwner(
      o: typeof result.owner,
    ): o is Extract<typeof result.owner, { type: FrameOwnerType.User }> {
      return o.type === FrameOwnerType.User;
    }

    if (!isUserOwner(result.owner)) {
      throw new Error("Expected user-owned frame");
    }
    const userOwner = result.owner as Extract<
      typeof result.owner,
      { type: FrameOwnerType.User }
    >;

    expect(userOwner.type).toBe(FrameOwnerType.User);
    expect(userOwner.user.id).toBe(userRecord.user_id.toString());
    expect(userOwner.user.username).toBe(userRecord.username);
  });

  it("throws NotFoundError when frame not found", async () => {
    vi.spyOn(prisma.frame, "findFirst").mockResolvedValue(null);

    await expect(getFrameById("doesnotexist")).rejects.toThrow(NotFoundError);
  });
});
