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
    if (frame.is_guild_owned) {
      guildIds.add(frame.owner_id);
    } else {
      userIds.add(frame.owner_id);
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
    : ([] as UserOwnerRecord[]),
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
    : ([] as GuildOwnerRecord[]),
  ]);

  return {
    usersById: new Map(
      users.map((user: UserOwnerRecord) => [user.user_id, user]),
    ),
    guildsById: new Map(
      guilds.map((guild: GuildOwnerRecord) => [guild.guild_id, guild]),
    ),
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
        type: FrameOwnerType.Guild,
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
