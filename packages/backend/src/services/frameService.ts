import {
  Frame,
  FrameOwnerType,
  GuildOwnedFrame,
  UserOwnedFrame,
} from "@blurple-canvas-web/types";
import { prisma } from "@/client";
import { NotFoundError } from "@/errors";

type FrameFindManyArgs = Parameters<(typeof prisma.frame)["findMany"]>[0];
type FrameSelect = NonNullable<FrameFindManyArgs>["select"];

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

function frameFromDb(frame: FrameDbRecord): Frame {
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
    if (!frame.owner_guild) {
      throw new Error(`Frame ${frame.id} is missing a valid guild owner`);
    }

    return {
      ...baseFrame,
      owner: {
        type: FrameOwnerType.Guild,
        guild: {
          guild_id: frame.owner_guild.guild_id.toString(),
          name: frame.owner_guild.name,
        },
      },
    };
  }

  if (!frame.owner_user) {
    throw new Error(`Frame ${frame.id} is missing a valid user owner`);
  }
  return {
    ...baseFrame,
    owner: {
      type: FrameOwnerType.User,
      user: {
        id: frame.owner_user.user_id.toString(),
        username: frame.owner_user.username,
        profilePictureUrl: frame.owner_user.profile_picture_url,
      },
    },
  };
}

function isUserOwnedFrame(frame: Frame): frame is UserOwnedFrame {
  return frame.owner.type === FrameOwnerType.User;
}

function isGuildOwnedFrame(frame: Frame): frame is GuildOwnedFrame {
  return frame.owner.type === FrameOwnerType.Guild;
}

function asUserFrame(frame: Frame): UserOwnedFrame {
  if (!isUserOwnedFrame(frame)) {
    throw new Error(`Frame ${frame.id} is missing a valid user owner`);
  }
  return frame;
}

function asGuildFrame(frame: Frame): GuildOwnedFrame {
  if (!isGuildOwnedFrame(frame)) {
    throw new Error(`Frame ${frame.id} is missing a valid guild owner`);
  }
  return frame;
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
): Promise<UserOwnedFrame[]> {
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

  return frames.map((frame) => asGuildFrame(frameFromDb(frame)));
}
