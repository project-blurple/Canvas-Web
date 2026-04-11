import { Frame } from "@blurple-canvas-web/types";
import { prisma } from "@/client";
import { NotFoundError } from "@/errors";

// biome-ignore lint/suspicious/noExplicitAny: extracting from below
function frameFromDb(frame: any): Frame {
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
    x_0: frame.x_0,
    y_0: frame.y_0,
    x_1: frame.x_1,
    y_1: frame.y_1,
  };
}

export async function getFrameById(frameId: string): Promise<Frame> {
  const frame = await prisma.frame.findUnique({
    where: {
      id: frameId,
    },
    select: {
      id: true,
      canvas_id: true,
      owner_id: true,
      is_guild_owned: true,
      owner_user: true,
      owner_guild: true,
      name: true,
      x_0: true,
      y_0: true,
      x_1: true,
      y_1: true,
    },
  });

  if (!frame) {
    throw new NotFoundError("Frame not found");
  }

  return frameFromDb(frame);
}

export async function getFramesByUserId(
  userId: string,
  canvas_id: number,
): Promise<Frame[]> {
  const frames = await prisma.frame.findMany({
    where: {
      owner_id: BigInt(userId),
      canvas_id: canvas_id,
      is_guild_owned: false,
    },
    select: {
      id: true,
      canvas_id: true,
      owner_id: true,
      is_guild_owned: true,
      owner_user: true,
      owner_guild: true,
      name: true,
      x_0: true,
      y_0: true,
      x_1: true,
      y_1: true,
    },
  });

  return frames.map(frameFromDb);
}

export async function getFramesByGuildIds(
  guildIds: string[],
  canvasId: number,
): Promise<Frame[]> {
  const frames = await prisma.frame.findMany({
    where: {
      owner_id: {
        in: guildIds.map(BigInt),
      },
      canvas_id: canvasId,
      is_guild_owned: true,
    },
    select: {
      id: true,
      canvas_id: true,
      owner_id: true,
      is_guild_owned: true,
      owner_user: true,
      owner_guild: true,
      name: true,
      x_0: true,
      y_0: true,
      x_1: true,
      y_1: true,
    },
  });

  return frames.map(frameFromDb);
}
