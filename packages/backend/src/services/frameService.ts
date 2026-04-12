import { Frame, GuildFrame, UserFrame } from "@blurple-canvas-web/types";
import { Prisma } from "@prisma/client";
import { prisma } from "@/client";
import { NotFoundError } from "@/errors";

const frameSelect = {
  id: true,
  canvas_id: true,
  owner_id: true,
  is_guild_owned: true,
  owner_user: {
    select: {
      user_id: true,
      username: true,
      profile_picture_url: true,
    },
  },
  owner_guild: {
    select: {
      guild_id: true,
      name: true,
    },
  },
  name: true,
  x_0: true,
  y_0: true,
  x_1: true,
  y_1: true,
  style_id: true,
} satisfies Prisma.frameSelect;

type FrameDbRecord = Prisma.frameGetPayload<{
  select: typeof frameSelect;
}>;

function frameFromDb(frame: FrameDbRecord): Frame {
  return {
    id: frame.id,
    canvasId: frame.canvas_id,
    ownerId: frame.owner_id.toString(),
    isGuildOwned: frame.is_guild_owned,
    ownerUser:
      frame.owner_user ?
        {
          id: frame.owner_user?.user_id.toString(),
          username: frame.owner_user?.username,
          profilePictureUrl: frame.owner_user?.profile_picture_url,
        }
      : undefined,
    ownerGuild:
      frame.owner_guild ?
        {
          guild_id: frame.owner_guild?.guild_id.toString(),
          name: frame.owner_guild?.name,
        }
      : undefined,
    name: frame.name,
    x0: frame.x_0,
    y0: frame.y_0,
    x1: frame.x_1,
    y1: frame.y_1,
  };
}

function asUserFrame(frame: Frame): UserFrame {
  if (!frame.ownerUser || frame.ownerGuild || frame.isGuildOwned) {
    throw new Error(`Frame ${frame.id} is missing a valid user owner`);
  }

  return {
    ...frame,
    isGuildOwned: false,
    ownerUser: frame.ownerUser,
    ownerGuild: undefined,
  };
}

function asGuildFrame(frame: Frame): GuildFrame {
  if (!frame.ownerGuild || frame.ownerUser || !frame.isGuildOwned) {
    throw new Error(`Frame ${frame.id} is missing a valid guild owner`);
  }

  return {
    ...frame,
    isGuildOwned: true,
    ownerUser: undefined,
    ownerGuild: frame.ownerGuild,
  };
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

  return frameFromDb(frame);
}

export async function getFramesByUserId(
  userId: string,
  canvasId: number,
): Promise<UserFrame[]> {
  const frames = await prisma.frame.findMany({
    where: {
      owner_id: BigInt(userId),
      canvas_id: canvasId,
      is_guild_owned: false,
    },
    select: frameSelect,
  });

  return frames.map((frame) => asUserFrame(frameFromDb(frame)));
}

export async function getFramesByGuildIds(
  guildIds: string[],
  canvasId: number,
): Promise<GuildFrame[]> {
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

  return frames.map((frame) => asGuildFrame(frameFromDb(frame)));
}
