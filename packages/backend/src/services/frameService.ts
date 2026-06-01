import {
  type DiscordUserProfile,
  type Frame,
  type FrameOwnerInput,
  FrameOwnerType,
  type GuildOwnedFrame,
  type UserOwnedFrame,
} from "@blurple-canvas-web/types";
import { Prisma, prisma } from "@/client";
import config from "@/config";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  UnprocessableError,
} from "@/errors";
import { PrismaErrorCode } from "@/utils";
import { getGuildPermissionsForUser } from "./discordGuildService";

type FrameFindManyArgs = Parameters<(typeof prisma.frame)["findMany"]>[0];
type FrameSelect = NonNullable<FrameFindManyArgs>["select"];

const frameSelect = {
  id: true,
  canvas_id: true,
  owner_user_id: true,
  owner_guild_id: true,
  name: true,
  x_0: true,
  y_0: true,
  x_1: true,
  y_1: true,
  style_id: true,
} as const satisfies FrameSelect;

async function findFrameForType(frameId: string) {
  return prisma.frame.findFirst({
    where: {
      id: {
        equals: frameId,
        mode: Prisma.QueryMode.insensitive,
      },
    },
    select: frameSelect,
  });
}

type FrameDbRecord = NonNullable<Awaited<ReturnType<typeof findFrameForType>>>;

interface UserOwnerRecord {
  user_id: bigint;
  username: string;
  profile_picture_url: string;
}

interface GuildOwnerRecord {
  guild_id: bigint;
  name: string;
}

interface OwnerLookup {
  usersById: Map<bigint, UserOwnerRecord>;
  guildsById: Map<bigint, GuildOwnerRecord>;
}

function partitionOwnerIds(frames: FrameDbRecord[]) {
  const userIds = new Set<bigint>();
  const guildIds = new Set<bigint>();

  for (const frame of frames) {
    if (frame.owner_user_id !== null) {
      userIds.add(frame.owner_user_id);
    } else if (frame.owner_guild_id !== null) {
      guildIds.add(frame.owner_guild_id);
    }
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

  if (frame.owner_guild_id !== null) {
    const guildData = owners.guildsById.get(frame.owner_guild_id);

    if (!guildData) {
      throw new Error(
        `Guild owner with ID ${frame.owner_guild_id} not found for frame ${frame.id}`,
      );
    }

    return {
      ...baseFrame,
      owner: {
        type: FrameOwnerType.Guild,
        guild: {
          guild_id: guildData.guild_id.toString(),
          name: guildData.name,
        },
      },
    };
  }

  if (frame.owner_user_id === null) {
    throw new Error(`Frame ${frame.id} has no owner set`);
  }

  const userData = owners.usersById.get(frame.owner_user_id);

  if (!userData) {
    throw new Error(
      `User owner with ID ${frame.owner_user_id} not found for frame ${frame.id}`,
    );
  }

  return {
    ...baseFrame,
    owner: {
      type: FrameOwnerType.User,
      user: {
        id: userData.user_id.toString(),
        username: userData.username,
        profilePictureUrl: userData.profile_picture_url,
      },
    },
  };
}

function asUserFrame(frame: Frame): asserts frame is UserOwnedFrame {
  if (frame.owner.type !== FrameOwnerType.User) {
    throw new Error(`Expected user-owned frame, got ${frame.owner.type}`);
  }
}

function asGuildFrame(frame: Frame): asserts frame is GuildOwnedFrame {
  if (frame.owner.type !== FrameOwnerType.Guild) {
    throw new Error(`Expected guild-owned frame, got ${frame.owner.type}`);
  }
}

export async function getFrameById(frameId: string): Promise<Frame> {
  const frame = await prisma.frame.findFirst({
    where: {
      id: {
        equals: frameId,
        mode: Prisma.QueryMode.insensitive,
      },
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
      owner_user_id: BigInt(userId),
      canvas_id: canvasId,
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
      owner_guild_id: {
        in: guildIds.map(BigInt),
      },
      canvas_id: canvasId,
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
  owner: FrameOwnerInput,
) {
  if (owner.type === FrameOwnerType.Guild) {
    const permissions = await getGuildPermissionsForUser(owner.id, accessToken);

    if (!permissions.administrator && !permissions.manage_guild) {
      throw new ForbiddenError(
        "You do not have permission to modify frames for this guild",
      );
    }
    return;
  }

  if (owner.id !== user.id) {
    throw new ForbiddenError("You are not the owner of this frame");
  }
}

async function assertUserHasPermissionsForFrameObject(
  user: DiscordUserProfile,
  accessToken: string,
  frame: Frame,
) {
  if (frame.owner.type === FrameOwnerType.System) {
    throw new ForbiddenError("System-owned frames cannot be edited");
  }

  const owner: FrameOwnerInput =
    frame.owner.type === FrameOwnerType.Guild ?
      { type: FrameOwnerType.Guild, id: frame.owner.guild.guild_id }
    : { type: FrameOwnerType.User, id: frame.owner.user.id };

  return assertUserHasPermissionsForFrame(user, accessToken, owner);
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
  owner: FrameOwnerInput,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
) {
  await assertUserHasPermissionsForFrame(user, accessToken, owner);

  await assertCoordsAreWithinCanvas(canvasId, x0, y0, x1, y1);

  const ownerColumns =
    owner.type === FrameOwnerType.Guild ?
      { owner_guild_id: BigInt(owner.id), owner_user_id: null }
    : { owner_user_id: BigInt(owner.id), owner_guild_id: null };

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
          ...ownerColumns,
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

export interface GetFrameCountForOwnerParams {
  canvasId: number;
  owner: FrameOwnerInput;
}

async function getFrameCountForOwner({
  canvasId,
  owner,
}: GetFrameCountForOwnerParams) {
  return prisma.frame.count({
    where: {
      canvas_id: canvasId,
      ...(owner.type === FrameOwnerType.Guild ?
        { owner_guild_id: BigInt(owner.id) }
      : { owner_user_id: BigInt(owner.id) }),
    },
  });
}

export async function assertMaxOwnerFramesNotExceeded({
  canvasId,
  owner,
}: GetFrameCountForOwnerParams) {
  const frameCount = await getFrameCountForOwner({ canvasId, owner });
  const isGuildOwner = owner.type === FrameOwnerType.Guild;
  const limit =
    isGuildOwner ? config.frames.maxAllowedGuild : config.frames.maxAllowedUser;

  if (frameCount >= limit) {
    throw new UnprocessableError(
      `Frame limit of ${limit} exceeded for this ${
        isGuildOwner ? "guild" : "user"
      } on this canvas`,
    );
  }
}
