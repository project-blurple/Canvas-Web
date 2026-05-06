import type { DiscordUserProfile, GuildData } from "@blurple-canvas-web/types";
import { prisma } from "@/client";
import config from "@/config";
import BadRequestError from "@/errors/BadRequestError";
import ForbiddenError from "@/errors/ForbiddenError";
import NotFoundError from "@/errors/NotFoundError";
import UnauthorizedError from "@/errors/UnauthorizedError";
import fetchWithRetries from "@/utils/fetchWithRetries";

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

interface GuildPermissionsSummary {
  administrator: boolean;
  manage_guild: boolean;
}

interface DiscordRequestOptions {
  endpoint: string;
  authorization: string;
}

interface CanvasAdminUser extends DiscordUserProfile {
  isCanvasAdmin: true;
}

interface CanvasModeratorUser extends DiscordUserProfile {
  isCanvasModerator: true;
}

async function discordRequest<T>({
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

  if (!response.ok) {
    throw new BadRequestError(
      `Discord API request failed with status ${response.status}: ${endpoint}`,
    );
  }

  return (await response.json()) as T;
}

function asBearerToken(accessToken: string): string {
  return `Bearer ${accessToken}`;
}

export async function getGuildPermissionsForUser(
  guildId: string,
  accessToken: string,
): Promise<GuildPermissionsSummary> {
  const guilds = await discordRequest<DiscordGuild[]>({
    endpoint: "/users/@me/guilds?with_counts=true",
    authorization: asBearerToken(accessToken),
  });

  const guild = guilds.find((currentGuild) => currentGuild.id === guildId);

  if (!guild) {
    throw new NotFoundError(
      `Discord resource not found: /users/@me/guilds/${encodeURIComponent(guildId)}`,
    );
  }

  const permissions = BigInt(guild.permissions ?? "0");
  return getPermissions(permissions);
}

interface userHasRoleInGuildProps {
  guildId: string;
  roleId: string;
  accessToken: string;
}

async function userHasRoleInGuild({
  guildId,
  roleId,
  accessToken,
}: userHasRoleInGuildProps): Promise<boolean> {
  let member: DiscordGuildMember;

  try {
    member = await discordRequest<DiscordGuildMember>({
      endpoint: `/users/@me/guilds/${encodeURIComponent(guildId)}/member`,
      authorization: asBearerToken(accessToken),
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return false;
    }

    throw error;
  }

  return member.roles.includes(roleId);
}

export async function isCanvasAdmin(accessToken: string): Promise<boolean> {
  const guildId = config.discord.discordManagementGuild;
  const roleId = config.discord.discordAdminRole;

  if (!guildId || !roleId || !accessToken) {
    return false;
  }

  return userHasRoleInGuild({ guildId, roleId, accessToken });
}

export async function isCanvasModerator(accessToken: string): Promise<boolean> {
  const guildId = config.discord.discordManagementGuild;
  const roleId = config.discord.discordModeratorRole;

  if (!guildId || !roleId || !accessToken) {
    return false;
  }

  return userHasRoleInGuild({ guildId, roleId, accessToken });
}

export async function getCurrentUserGuildFlags(
  accessToken: string,
): Promise<Record<string, GuildData>> {
  const guilds = await discordRequest<DiscordGuild[]>({
    endpoint: "/users/@me/guilds?with_counts=true",
    authorization: asBearerToken(accessToken),
  });

  return Object.fromEntries(
    guilds.map((guild) => {
      const permissions = BigInt(guild.permissions ?? "0");
      const { administrator, manage_guild: manageGuild } =
        getPermissions(permissions);
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

function getPermissions(permissions: bigint): GuildPermissionsSummary {
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

export function assertCanvasAdmin(
  user: DiscordUserProfile,
): asserts user is CanvasAdminUser {
  if (!user.isCanvasAdmin) {
    throw new ForbiddenError(
      "You do not have permission to perform this action",
    );
  }
}

export function assertIsCanvasModerator(
  user: DiscordUserProfile,
): asserts user is CanvasModeratorUser | CanvasAdminUser {
  if (!user.isCanvasModerator) {
    throw new ForbiddenError(
      "You do not have permission to perform this action",
    );
  }
}

export async function syncDiscordGuildRecords(
  guildFlags?: Record<string, GuildData>,
): Promise<void> {
  if (!guildFlags || Object.keys(guildFlags).length === 0) return;

  // not an upsert because upserts are expensive, especially when most existing rows probably won't need updates

  const entries = Object.entries(guildFlags);
  const ids = entries.map(([id]) => BigInt(id));

  // 1) fetch existing records once
  const existing = await prisma.discord_guild_record.findMany({
    where: { guild_id: { in: ids } },
  });
  const existingMap = new Map(existing.map((r) => [r.guild_id.toString(), r]));

  // 2) compute create + update sets
  const toCreate = entries
    .filter(([id]) => !existingMap.has(id))
    .map(([id, data]) => ({ guild_id: BigInt(id), name: data.name }));

  const toUpdateEntries = entries.filter(([id, data]) => {
    const ex = existingMap.get(id);
    return !!ex && ex.name !== data.name;
  });

  if (toCreate.length === 0 && toUpdateEntries.length === 0) return;

  // 3) Create missing rows
  if (toCreate.length > 0) {
    await prisma.discord_guild_record.createMany({
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
        prisma.discord_guild_record.update({
          where: { guild_id: BigInt(id) },
          data: { name: data.name },
        }),
      ),
    );
  }
}
