import type {
  DiscordUserProfile,
  Frame,
  GuildOwnedFrame,
  UserOwnedFrame,
} from "@blurple-canvas-web/types";
import { Prisma, prisma } from "@/client";
import config from "@/config";
import { BadRequestError, ForbiddenError, NotFoundError } from "@/errors";
import { PrismaErrorCode } from "@/utils";
import { getGuildPermissionsForUser } from "./discordGuildService";

type FrameFindManyArgs = Parameters<(typeof prisma.frame)["findMany"]>[0];
type FrameSelect = NonNullable<FrameFindManyArgs>["select"];

const frameSelect = {
  id: true,
  canvas_id: true,
  owner_id: true,
  is_guild_owned: true,
  name: true,
  x_0: true,
  y_0: true,
  x_1: true,
  y_1: true,
  style_id: true,
} as const satisfies FrameSelect;

async function findFrameForType(frameId: string) {
  return prisma.frame.findUnique({
    where: {
      id: frameId,
    },
    select: frameSelect,
  });
}

type FrameDbRecord = NonNullable<Awaited<ReturnType<typeof findFrameForType>>>;

type UserOwnerRecord = {
  user_id: bigint;
  username: string;
  profile_picture_url: string;
};

type GuildOwnerRecord = {
  guild_id: bigint;
  name: string;
};

type OwnerLookup = {
  usersById: Map<bigint, UserOwnerRecord>;
  guildsById: Map<bigint, GuildOwnerRecord>;
};

function partitionOwnerIds(frames: FrameDbRecord[]) {
  const userIds = new Set<bigint>();
  const guildIds = new Set<bigint>();

  for (const frame of frames) {
    (frame.is_guild_owned ? guildIds : userIds).add(frame.owner_id);
  }

  return {
    userIds: [...userIds],
    guildIds: [...guildIds],
  };
}

async function loadOwnerLookup(frames: FrameDbRecord[]): Promise<OwnerLookup> {
  const { userIds, guildIds } = partitionOwnerIds(frames);

  const [users, guilds] = await Promise.all([
    userIds.length ?
      prisma.discord_user_profile.findMany({
        where: {
          user_id: {
            in: userIds,
          },
        },
        select: {
          user_id: true,
          username: true,
          profile_picture_url: true,
        },
      })
    : [],
    guildIds.length ?
      prisma.discord_guild_record.findMany({
        where: {
          guild_id: {
            in: guildIds,
          },
        },
        select: {
          guild_id: true,
          name: true,
        },
      })
    : [],
  ]);

  return {
    usersById: new Map(users.map((user) => [user.user_id, user])),
    guildsById: new Map(guilds.map((guild) => [guild.guild_id, guild])),
  };
}

function frameFromDb(frame: FrameDbRecord, owners: OwnerLookup): Frame {
  const baseFrame = {
    id: frame.id,
    canvasId: frame.canvas_id,
    name: frame.name,
    x0: frame.x_0,
    y0: frame.y_0,
    x1: frame.x_1,
    y1: frame.y_1,
  };

  if (frame.is_guild_owned) {
    const guildData = owners.guildsById.get(frame.owner_id);

    if (!guildData) {
      throw new Error(
        `Guild owner with ID ${frame.owner_id} not found for frame ${frame.id}`,
      );
    }

    return {
      ...baseFrame,
      owner: {
        type: "guild",
        guild: {
          guild_id: guildData.guild_id.toString(),
          name: guildData.name,
        },
      },
    };
  }

  const userData = owners.usersById.get(frame.owner_id);

  if (!userData) {
    throw new Error(
      `User owner with ID ${frame.owner_id} not found for frame ${frame.id}`,
    );
  }

  return {
    ...baseFrame,
    owner: {
      type: "user",
      user: {
        id: userData.user_id.toString(),
        username: userData.username,
        profilePictureUrl: userData.profile_picture_url,
      },
    },
  };
}

function asUserFrame(frame: Frame): asserts frame is UserOwnedFrame {
  if (frame.owner.type !== "user") {
    throw new Error(`Expected user-owned frame, got ${frame.owner.type}`);
  }
}

function asGuildFrame(frame: Frame): asserts frame is GuildOwnedFrame {
  if (frame.owner.type !== "guild") {
    throw new Error(`Expected guild-owned frame, got ${frame.owner.type}`);
  }
}

export async function getFrameById(frameId: string): Promise<Frame> {
  const frame = await prisma.frame.findUnique({
    where: {
      id: frameId,
    },
    select: frameSelect,
  });

  if (!frame) {
    throw new NotFoundError("Frame not found");
  }

  const owners = await loadOwnerLookup([frame]);
  return frameFromDb(frame, owners);
}

export async function getFramesByUserId(
  userId: string,
  canvasId: number,
): Promise<UserOwnedFrame[]> {
  const frames = await prisma.frame.findMany({
    where: {
      owner_id: BigInt(userId),
      canvas_id: canvasId,
      is_guild_owned: false,
    },
    select: frameSelect,
  });

  const owners = await loadOwnerLookup(frames);

  return frames.map((frame: FrameDbRecord) => {
    const mapped = frameFromDb(frame, owners);
    asUserFrame(mapped);
    return mapped;
  });
}

export async function getFramesByGuildIds(
  guildIds: string[],
  canvasId: number,
): Promise<GuildOwnedFrame[]> {
  const frames = await prisma.frame.findMany({
    where: {
      owner_id: {
        in: guildIds.map(BigInt),
      },
      canvas_id: canvasId,
      is_guild_owned: true,
    },
    select: frameSelect,
  });

  const owners = await loadOwnerLookup(frames);

  return frames.map((frame: FrameDbRecord) => {
    const mapped = frameFromDb(frame, owners);
    asGuildFrame(mapped);
    return mapped;
  });
}

async function assertUserHasPermissionsForFrame(
  user: DiscordUserProfile,
  accessToken: string,
  isGuildOwned: boolean,
  ownerId: string,
) {
  if (isGuildOwned) {
    const permissions = await getGuildPermissionsForUser(ownerId, accessToken);

    if (!permissions.administrator && !permissions.manage_guild) {
      throw new ForbiddenError(
        "You do not have permission to modify frames for this guild",
      );
    }
  }

  if (ownerId !== user.id) {
    throw new ForbiddenError("You are not the owner of this frame");
  }
}

async function assertUserHasPermissionsForFrameObject(
  user: DiscordUserProfile,
  accessToken: string,
  frame: Frame,
) {
  if (frame.owner.type === "system") {
    throw new ForbiddenError("System-owned frames cannot be edited");
  }
  return assertUserHasPermissionsForFrame(
    user,
    accessToken,
    frame.owner.type === "guild",
    frame.owner.type === "guild" ?
      frame.owner.guild.guild_id
    : frame.owner.user.id,
  );
}

async function assertCoordsAreWithinCanvas(
  canvasId: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
) {
  const canvas = await prisma.canvas.findUnique({
    where: {
      id: canvasId,
    },
    select: {
      width: true,
      height: true,
    },
  });

  if (!canvas) {
    throw new NotFoundError("Canvas not found");
  }

  if (x0 < 0 || y0 < 0 || x1 > canvas.width || y1 > canvas.height) {
    throw new BadRequestError(
      "Frame coordinates must be within the bounds of the canvas",
    );
  }

  return canvas;
}

export async function editFrame(
  user: DiscordUserProfile,
  accessToken: string,
  frameId: string,
  name: string,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
) {
  const frame = await getFrameById(frameId);

  await assertUserHasPermissionsForFrameObject(user, accessToken, frame);

  await assertCoordsAreWithinCanvas(frame.canvasId, x0, y0, x1, y1);

  return await prisma.frame.update({
    where: {
      id: frameId,
    },
    data: {
      name,
      x_0: x0,
      y_0: y0,
      x_1: x1,
      y_1: y1,
    },
  });
}

export async function deleteFrame(
  user: DiscordUserProfile,
  accessToken: string,
  frameId: string,
) {
  const frame = await getFrameById(frameId);

  await assertUserHasPermissionsForFrameObject(user, accessToken, frame);

  await prisma.frame.delete({
    where: {
      id: frameId,
    },
  });
}

export async function createFrame(
  user: DiscordUserProfile,
  accessToken: string,
  canvasId: number,
  name: string,
  ownerId: string,
  isGuildOwned: boolean,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
) {
  await assertUserHasPermissionsForFrame(
    user,
    accessToken,
    isGuildOwned,
    ownerId,
  );

  await assertCoordsAreWithinCanvas(canvasId, x0, y0, x1, y1);

  while (true) {
    // Frame IDs are all 6-character hex strings, between 000000 and FFFFFF inclusive
    // These are like hex colour codes!
    const id = Math.floor(Math.random() * 0x1000000)
      .toString(16)
      .padStart(6, "0");

    try {
      await prisma.frame.create({
        data: {
          id,
          canvas_id: canvasId,
          name,
          owner_id: BigInt(ownerId),
          is_guild_owned: isGuildOwned,
          x_0: x0,
          y_0: y0,
          x_1: x1,
          y_1: y1,
        },
      });
      return;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === PrismaErrorCode.UniqueConstraintViolation
      ) {
        continue;
      }
      throw error;
    }
  }
}

async function getFrameCountForOwner(
  canvasId: number,
  ownerId: string,
  isGuildOwned: boolean,
) {
  return prisma.frame.count({
    where: {
      canvas_id: canvasId,
      owner_id: BigInt(ownerId),
      is_guild_owned: isGuildOwned,
    },
  });
}

export async function assertOwnerFrameLimitNotExceeded(
  canvasId: number,
  ownerId: string,
  isGuildOwned: boolean,
) {
  const frameCount = await getFrameCountForOwner(
    canvasId,
    ownerId,
    isGuildOwned,
  );
  const limit =
    isGuildOwned ? config.frames.guildLimit : config.frames.userLimit;

  if (frameCount >= limit) {
    throw new BadRequestError(
      `Frame limit of ${limit} exceeded for this ${
        isGuildOwned ? "guild" : "user"
      } on this canvas`,
    );
  }
}
