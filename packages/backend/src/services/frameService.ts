import {
  DiscordUserProfile,
  Frame,
  FrameOwnerType,
  GuildOwnedFrame,
  UserOwnedFrame,
} from "@blurple-canvas-web/types";
import { prisma } from "@/client";
import { ForbiddenError, NotFoundError } from "@/errors";
import { getGuildPermissionsForUser } from "./discordGuildService";

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

  return frames.map((frame) => {
    const mapped = frameFromDb(frame);
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

  return frames.map((frame) => {
    const mapped = frameFromDb(frame);
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
  } else {
    if (ownerId !== user.id) {
      throw new ForbiddenError("You are not the owner of this frame");
    }
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
  return assertUserHasPermissionsForFrame(
    user,
    accessToken,
    frame.owner.type === FrameOwnerType.Guild,
    frame.owner.type === FrameOwnerType.Guild ?
      frame.owner.guild.guild_id
    : frame.owner.user.id,
  );
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

  if (!frame) {
    throw new NotFoundError("Frame not found");
  }

  await assertUserHasPermissionsForFrameObject(user, accessToken, frame);

  await prisma.frame.update({
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

  if (!frame) {
    throw new NotFoundError("Frame not found");
  }

  await assertUserHasPermissionsForFrameObject(user, accessToken, frame);

  await prisma.frame.delete({
    where: {
      id: frameId,
    },
  });
}

async function generateUniqueFrameId(): Promise<string> {
  // Frame IDs are all 6-character hex strings, between 000000 and FFFFFF inclusive
  // These are like hex colour codes!

  while (true) {
    const id = Math.floor(Math.random() * 0xffffff)
      .toString(16)
      .padStart(6, "0");
    const existing = await prisma.frame.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
      },
    });
    if (!existing) {
      return id;
    }
  }
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

  const id = await generateUniqueFrameId();

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
}
