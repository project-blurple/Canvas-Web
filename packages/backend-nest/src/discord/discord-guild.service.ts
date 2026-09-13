import type { GuildData } from "@blurple-canvas-web/types";
import { Inject, Injectable } from "@nestjs/common";
import type { SessionData } from "express-session";

import { PrismaService } from "@/common/database/core/prisma.service";
import { ApiError } from "@/common/errors/api.error";
import { BadRequestError } from "@/common/errors/bad-request.error";
import { NotFoundError } from "@/common/errors/not-found.error";
import { TooManyRequestsError } from "@/common/errors/too-many-requests.error";
import { UnauthorizedError } from "@/common/errors/unauthorized.error";
import { fetchWithRetries } from "@/common/fetch-with-retries";
import { type DiscordConfig, discordConfig } from "@/config/discord.config";

const GUILD_FLAGS_CACHE_TTL_MS = 900_000; // 15 min

const DISCORD_API_BASE_URL = "https://discord.com/api/v10";
const ADMINISTRATOR_PERMISSION = 0x8n;
const MANAGE_GUILD_PERMISSION = 0x20n;

interface DiscordGuild {
  id: string;
  name: string;
  owner_id: string;
  permissions?: string;
  approximate_member_count?: number;
}

interface DiscordGuildMember {
  user?: {
    id: string;
  };
  roles: string[];
}

export interface GuildPermissionsSummary {
  administrator: boolean;
  manage_guild: boolean;
}

interface DiscordRequestOptions {
  endpoint: string;
  authorization: `Bearer ${string}`;
}

interface UserHasRolesInGuildProps {
  guildId: string;
  roleIds: string[];
  accessToken: string;
}

type DiscordRateLimitHeader =
  | "x-ratelimit-limit"
  | "x-ratelimit-remaining"
  | "x-ratelimit-reset"
  | "x-ratelimit-reset-after"
  | "x-ratelimit-bucket";

@Injectable()
export class DiscordGuildService {
  private readonly discordRateLimitHeaders = new Set<DiscordRateLimitHeader>([
    "x-ratelimit-limit",
    "x-ratelimit-remaining",
    "x-ratelimit-reset",
    "x-ratelimit-reset-after",
    "x-ratelimit-bucket",
  ]);
  constructor(
    private readonly prisma: PrismaService,
    @Inject(discordConfig.KEY) private readonly config: DiscordConfig,
  ) {}

  async getGuildPermissionsForUser(
    guildId: string,
    accessToken: string,
  ): Promise<GuildPermissionsSummary> {
    const guilds = await this.discordRequest<DiscordGuild[]>({
      endpoint: "/users/@me/guilds?with_counts=true",
      authorization: this.asBearerToken(accessToken),
    });

    const guild = guilds.find((currentGuild) => currentGuild.id === guildId);

    if (!guild) {
      throw new NotFoundError(
        `Discord resource not found: /users/@me/guilds/${encodeURIComponent(guildId)}`,
      );
    }

    const permissions = BigInt(guild.permissions ?? "0");
    return this.getPermissions(permissions);
  }

  async isCanvasAdmin(accessToken: string): Promise<boolean> {
    const guildId = this.config.managementGuildId;
    const roleId = this.config.adminRoleId;

    if (!guildId || !roleId || !accessToken) {
      return false;
    }

    return await this.userHasRolesInGuild({
      guildId,
      roleIds: [roleId],
      accessToken,
    });
  }

  async isCanvasModerator(accessToken: string): Promise<boolean> {
    const guildId = this.config.managementGuildId;
    const roleIds = [
      this.config.moderatorRoleId,
      this.config.adminRoleId,
    ].filter((roleId): roleId is string => Boolean(roleId));

    if (!guildId || !accessToken || roleIds.length === 0) {
      return false;
    }

    return await this.userHasRolesInGuild({ guildId, roleIds, accessToken });
  }

  async getCurrentUserGuildFlags(
    accessToken: string,
  ): Promise<Record<string, GuildData>> {
    const guilds = await this.discordRequest<DiscordGuild[]>({
      endpoint: "/users/@me/guilds?with_counts=true",
      authorization: this.asBearerToken(accessToken),
    });

    return Object.fromEntries(
      guilds.map((guild) => {
        const permissions = BigInt(guild.permissions ?? "0");
        const { administrator, manage_guild: manageGuild } =
          this.getPermissions(permissions);
        return [
          guild.id,
          {
            name: guild.name,
            memberCount: guild.approximate_member_count ?? null,
            administrator,
            manageGuild,
          },
        ];
      }),
    );
  }

  async getCachedUserGuildFlags(
    session: SessionData,
    accessToken: string,
  ): Promise<Record<string, GuildData>> {
    const cached = session.discordGuildFlags;
    const fetchedAt = session.discordGuildFlagsFetchedAt;
    const isFresh =
      cached !== undefined &&
      typeof fetchedAt === "number" &&
      Date.now() - fetchedAt < GUILD_FLAGS_CACHE_TTL_MS;

    if (isFresh) {
      return cached;
    }

    return await this.refreshCachedUserGuildFlags(session, accessToken);
  }

  async refreshCachedUserGuildFlags(
    session: SessionData,
    accessToken: string,
  ): Promise<Record<string, GuildData>> {
    const guildFlags = await this.getCurrentUserGuildFlags(accessToken);
    session.discordGuildFlags = guildFlags;
    session.discordGuildFlagsFetchedAt = Date.now();
    return guildFlags;
  }

  async syncDiscordGuildRecords(
    guildFlags?: Record<string, GuildData>,
  ): Promise<void> {
    if (!guildFlags || Object.keys(guildFlags).length === 0) return;

    // not an upsert because upserts are expensive, especially when most existing rows probably won't need updates

    const entries = Object.entries(guildFlags);
    const ids = entries.map(([id]) => BigInt(id));

    // 1) fetch existing records once
    const existing = await this.prisma.discordGuildRecord.findMany({
      where: { guildId: { in: ids } },
    });
    const existingMap = new Map(existing.map((r) => [r.guildId.toString(), r]));

    // 2) compute create + update sets
    const toCreate = entries
      .filter(([id]) => !existingMap.has(id))
      .map(([id, data]) => ({ guildId: BigInt(id), name: data.name }));

    const toUpdateEntries = entries.filter(([id, data]) => {
      const ex = existingMap.get(id);
      return !!ex && ex.name !== data.name;
    });

    if (toCreate.length === 0 && toUpdateEntries.length === 0) return;

    // 3) Create missing rows
    if (toCreate.length > 0) {
      await this.prisma.discordGuildRecord.createMany({
        data: toCreate,
        skipDuplicates: true,
      });
    }

    // 4) Update changed names in bounded parallel chunks
    const UPDATE_CHUNK = 50;
    for (let i = 0; i < toUpdateEntries.length; i += UPDATE_CHUNK) {
      const chunk = toUpdateEntries.slice(i, i + UPDATE_CHUNK);
      await Promise.all(
        chunk.map(([id, data]) =>
          this.prisma.discordGuildRecord.update({
            where: { guildId: BigInt(id) },
            data: { name: data.name },
          }),
        ),
      );
    }
  }

  private isDiscordRateLimitHeader(key: string): key is DiscordRateLimitHeader {
    return this.discordRateLimitHeaders.has(key as DiscordRateLimitHeader);
  }

  private async discordRequest<T>({
    endpoint,
    authorization,
  }: DiscordRequestOptions): Promise<T> {
    const response = await fetchWithRetries(
      `${DISCORD_API_BASE_URL}${endpoint}`,
      {
        headers: {
          Authorization: authorization,
        },
      },
    );

    if (response.status === 401 || response.status === 403) {
      throw new UnauthorizedError(
        "Discord token is invalid or missing permissions",
      );
    }

    if (response.status === 404) {
      throw new NotFoundError(`Discord resource not found: ${endpoint}`);
    }

    if (response.status === 429) {
      const rateLimitHeaders: Partial<Record<DiscordRateLimitHeader, string>> =
        {};
      for (const [k, v] of response.headers.entries()) {
        if (this.isDiscordRateLimitHeader(k)) rateLimitHeaders[k] = v;
      }

      console.error("Headers", rateLimitHeaders);
      console.error("Body", await response.json());

      const retryAfter = response.headers.get("retry-after");
      const suffix =
        retryAfter ?
          new Intl.DurationFormat("en-US", { style: "narrow" }).format({
            seconds: Math.ceil(Number.parseFloat(retryAfter)),
          })
        : "";
      throw new TooManyRequestsError(
        `Rate limited by Discord API. Please try again${suffix}.`,
      );
    }

    if (!response.ok) {
      console.error(response);
      throw new BadRequestError(
        `Discord API request failed with status ${response.status}: ${endpoint}`,
      );
    }

    const contentType = response.headers.get("content-type");
    if (!contentType?.startsWith("application/json")) {
      throw new ApiError(
        `Expected application/json but got ${contentType}`,
        500,
      );
    }

    return (await response.json()) as T;
  }

  private asBearerToken<T extends string>(accessToken: T): `Bearer ${T}` {
    return `Bearer ${accessToken}`;
  }

  private getPermissions(permissions: bigint): GuildPermissionsSummary {
    const administrator =
      (permissions & ADMINISTRATOR_PERMISSION) === ADMINISTRATOR_PERMISSION;
    const manageGuild =
      administrator ||
      (permissions & MANAGE_GUILD_PERMISSION) === MANAGE_GUILD_PERMISSION;

    return {
      administrator,
      manage_guild: manageGuild,
    };
  }

  private async userHasRolesInGuild({
    guildId,
    roleIds,
    accessToken,
  }: UserHasRolesInGuildProps): Promise<boolean> {
    let member: DiscordGuildMember;

    try {
      member = await this.discordRequest<DiscordGuildMember>({
        endpoint: `/users/@me/guilds/${encodeURIComponent(guildId)}/member`,
        authorization: this.asBearerToken(accessToken),
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        return false;
      }

      throw error;
    }

    return member.roles.some((role) => roleIds.includes(role));
  }
}
