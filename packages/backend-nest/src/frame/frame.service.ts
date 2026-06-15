import {
  type DiscordUserProfile,
  type Frame,
  type FrameOwnerInput,
  FrameOwnerType,
  type GuildOwnedFrame,
  type UserOwnedFrame,
} from "@blurple-canvas-web/types";
import { Inject, Injectable } from "@nestjs/common";

import { Prisma } from "@/common/database/prisma.client";
import { PrismaService } from "@/common/database/prisma.service";
import { BadRequestError } from "@/common/errors/bad-request.error";
import { ForbiddenError } from "@/common/errors/forbidden.error";
import { NotFoundError } from "@/common/errors/not-found.error";
import { UnprocessableError } from "@/common/errors/unprocessable.error";
import { type FramesConfig, framesConfig } from "@/config/frames.config";
import { DiscordGuildService } from "@/discord/discord-guild.service";

const MAX_FRAME_ID_ATTEMPTS = 10;

const frameSelect = {
  id: true,
  canvasId: true,
  ownerUserId: true,
  ownerGuildId: true,
  name: true,
  x0: true,
  y0: true,
  x1: true,
  y1: true,
  styleId: true,
} as const satisfies Prisma.FrameSelect;

type FrameDbRecord = Prisma.FrameGetPayload<{ select: typeof frameSelect }>;

interface UserOwnerRecord {
  userId: bigint;
  username: string;
  profilePictureUrl: string;
}

interface GuildOwnerRecord {
  guildId: bigint;
  name: string;
}

interface OwnerLookup {
  usersById: Map<bigint, UserOwnerRecord>;
  guildsById: Map<bigint, GuildOwnerRecord>;
}

export interface GetFrameCountForOwnerParams {
  canvasId: number;
  owner: FrameOwnerInput;
}

@Injectable()
export class FrameService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly discordGuildService: DiscordGuildService,
    @Inject(framesConfig.KEY) private readonly frames: FramesConfig,
  ) {}

  private partitionOwnerIds(frames: FrameDbRecord[]) {
    const userIds = new Set<bigint>();
    const guildIds = new Set<bigint>();

    for (const frame of frames) {
      if (frame.ownerUserId !== null) {
        userIds.add(frame.ownerUserId);
      } else if (frame.ownerGuildId !== null) {
        guildIds.add(frame.ownerGuildId);
      }
    }

    return {
      userIds: [...userIds],
      guildIds: [...guildIds],
    };
  }

  private async loadOwnerLookup(frames: FrameDbRecord[]): Promise<OwnerLookup> {
    const { userIds, guildIds } = this.partitionOwnerIds(frames);

    const [users, guilds] = await Promise.all([
      userIds.length ?
        this.prisma.discordUserProfile.findMany({
          where: {
            userId: {
              in: userIds,
            },
          },
          select: {
            userId: true,
            username: true,
            profilePictureUrl: true,
          },
        })
      : [],
      guildIds.length ?
        this.prisma.discordGuildRecord.findMany({
          where: {
            guildId: {
              in: guildIds,
            },
          },
          select: {
            guildId: true,
            name: true,
          },
        })
      : [],
    ]);

    return {
      usersById: new Map(users.map((user) => [user.userId, user])),
      guildsById: new Map(guilds.map((guild) => [guild.guildId, guild])),
    };
  }

  private frameFromDb(frame: FrameDbRecord, owners: OwnerLookup): Frame {
    const baseFrame = {
      id: frame.id,
      canvasId: frame.canvasId,
      name: frame.name,
      x0: frame.x0,
      y0: frame.y0,
      x1: frame.x1,
      y1: frame.y1,
    };

    if (frame.ownerGuildId !== null) {
      const guildData = owners.guildsById.get(frame.ownerGuildId);

      if (!guildData) {
        throw new Error(
          `Guild owner with ID ${frame.ownerGuildId} not found for frame ${frame.id}`,
        );
      }

      return {
        ...baseFrame,
        owner: {
          type: FrameOwnerType.Guild,
          guild: {
            guild_id: guildData.guildId.toString(),
            name: guildData.name,
          },
        },
      };
    }

    if (frame.ownerUserId === null) {
      throw new Error(`Frame ${frame.id} has no owner set`);
    }

    const userData = owners.usersById.get(frame.ownerUserId);

    if (!userData) {
      throw new Error(
        `User owner with ID ${frame.ownerUserId} not found for frame ${frame.id}`,
      );
    }

    return {
      ...baseFrame,
      owner: {
        type: FrameOwnerType.User,
        user: {
          id: userData.userId.toString(),
          username: userData.username,
          profilePictureUrl: userData.profilePictureUrl,
        },
      },
    };
  }

  private asUserFrame(frame: Frame): asserts frame is UserOwnedFrame {
    if (frame.owner.type !== FrameOwnerType.User) {
      throw new Error(`Expected user-owned frame, got ${frame.owner.type}`);
    }
  }

  private asGuildFrame(frame: Frame): asserts frame is GuildOwnedFrame {
    if (frame.owner.type !== FrameOwnerType.Guild) {
      throw new Error(`Expected guild-owned frame, got ${frame.owner.type}`);
    }
  }

  async getFrameById(frameId: string): Promise<Frame> {
    const frame = await this.prisma.frame.findFirst({
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

    const owners = await this.loadOwnerLookup([frame]);
    return this.frameFromDb(frame, owners);
  }

  async getFramesByUserId(
    userId: string,
    canvasId: number,
  ): Promise<UserOwnedFrame[]> {
    const frames = await this.prisma.frame.findMany({
      where: {
        ownerUserId: BigInt(userId),
        canvasId,
      },
      select: frameSelect,
    });

    const owners = await this.loadOwnerLookup(frames);

    return frames.map((frame) => {
      const mapped = this.frameFromDb(frame, owners);
      this.asUserFrame(mapped);
      return mapped;
    });
  }

  async getFramesByGuildIds(
    guildIds: string[],
    canvasId: number,
  ): Promise<GuildOwnedFrame[]> {
    const frames = await this.prisma.frame.findMany({
      where: {
        ownerGuildId: {
          in: guildIds.map(BigInt),
        },
        canvasId,
      },
      select: frameSelect,
    });

    const owners = await this.loadOwnerLookup(frames);

    return frames.map((frame) => {
      const mapped = this.frameFromDb(frame, owners);
      this.asGuildFrame(mapped);
      return mapped;
    });
  }

  private async assertUserHasPermissionsForFrame(
    user: DiscordUserProfile,
    accessToken: string,
    owner: FrameOwnerInput,
  ) {
    if (owner.type === FrameOwnerType.Guild) {
      const permissions =
        await this.discordGuildService.getGuildPermissionsForUser(
          owner.id,
          accessToken,
        );

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

  private async assertUserHasPermissionsForFrameObject(
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

    return this.assertUserHasPermissionsForFrame(user, accessToken, owner);
  }

  private async assertCoordsAreWithinCanvas(
    canvasId: number,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
  ) {
    const canvas = await this.prisma.canvas.findUnique({
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

  async editFrame(
    user: DiscordUserProfile,
    accessToken: string,
    frameId: string,
    name: string,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
  ) {
    const frame = await this.getFrameById(frameId);

    await this.assertUserHasPermissionsForFrameObject(user, accessToken, frame);

    await this.assertCoordsAreWithinCanvas(frame.canvasId, x0, y0, x1, y1);

    return await this.prisma.frame.update({
      where: {
        id: frameId,
      },
      data: {
        name,
        x0,
        y0,
        x1,
        y1,
      },
    });
  }

  async deleteFrame(
    user: DiscordUserProfile,
    accessToken: string,
    frameId: string,
  ) {
    const frame = await this.getFrameById(frameId);

    await this.assertUserHasPermissionsForFrameObject(user, accessToken, frame);

    await this.prisma.frame.delete({
      where: {
        id: frameId,
      },
    });
  }

  async createFrame(
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
    await this.assertUserHasPermissionsForFrame(user, accessToken, owner);

    await this.assertCoordsAreWithinCanvas(canvasId, x0, y0, x1, y1);

    const ownerColumns =
      owner.type === FrameOwnerType.Guild ?
        { ownerGuildId: BigInt(owner.id), ownerUserId: null }
      : { ownerUserId: BigInt(owner.id), ownerGuildId: null };

    // Frame IDs are random 6-character hex strings (000000–FFFFFF), so
    // collisions are retried. The attempt cap guards against an unexpectedly
    // exhausted id space spinning forever.
    for (let attempt = 0; attempt < MAX_FRAME_ID_ATTEMPTS; attempt++) {
      const id = Math.floor(Math.random() * 0x1000000)
        .toString(16)
        .padStart(6, "0");

      try {
        return await this.prisma.frame.create({
          data: {
            id,
            canvasId,
            name,
            ...ownerColumns,
            x0,
            y0,
            x1,
            y1,
          },
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          continue;
        }
        throw error;
      }
    }

    throw new Error(
      `Failed to allocate a unique frame id after ${MAX_FRAME_ID_ATTEMPTS} attempts`,
    );
  }

  private async getFrameCountForOwner({
    canvasId,
    owner,
  }: GetFrameCountForOwnerParams) {
    return this.prisma.frame.count({
      where: {
        canvasId,
        ...(owner.type === FrameOwnerType.Guild ?
          { ownerGuildId: BigInt(owner.id) }
        : { ownerUserId: BigInt(owner.id) }),
      },
    });
  }

  async assertMaxOwnerFramesNotExceeded({
    canvasId,
    owner,
  }: GetFrameCountForOwnerParams) {
    const frameCount = await this.getFrameCountForOwner({ canvasId, owner });
    const isGuildOwner = owner.type === FrameOwnerType.Guild;
    const limit =
      isGuildOwner ? this.frames.maxAllowedGuild : this.frames.maxAllowedUser;

    if (frameCount >= limit) {
      throw new UnprocessableError(
        `Frame limit of ${limit} exceeded for this ${
          isGuildOwner ? "guild" : "user"
        } on this canvas`,
      );
    }
  }
}
