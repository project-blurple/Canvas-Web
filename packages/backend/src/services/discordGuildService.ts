import { DiscordUserProfile, GuildData } from "@blurple-canvas-web/types";
import config from "@/config";
import BadRequestError from "@/errors/BadRequestError";
import ForbiddenError from "@/errors/ForbiddenError";
import NotFoundError from "@/errors/NotFoundError";
import UnauthorizedError from "@/errors/UnauthorizedError";

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
  authorization: string;
}

type CanvasAdminUser = DiscordUserProfile & { isCanvasAdmin: true };
type CanvasModeratorUser = DiscordUserProfile & { isCanvasModerator: true };

async function discordRequest<T>({
  endpoint,
  authorization,
}: DiscordRequestOptions): Promise<T> {
  const response = await fetch(`${DISCORD_API_BASE_URL}${endpoint}`, {
    headers: {
      Authorization: authorization,
    },
  });

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

export async function userHasRoleInGuild(
  guildId: string,
  roleId: string,
  accessToken: string,
): Promise<boolean> {
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

  return userHasRoleInGuild(guildId, roleId, accessToken);
}

export async function isCanvasModerator(accessToken: string): Promise<boolean> {
  const guildId = config.discord.discordManagementGuild;
  const roleId = config.discord.discordModeratorRole;

  if (!guildId || !roleId || !accessToken) {
    return false;
  }

  return userHasRoleInGuild(guildId, roleId, accessToken);
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

export function assertCanvasModerator(
  user: DiscordUserProfile,
): asserts user is CanvasModeratorUser {
  if (!user.isCanvasModerator) {
    throw new ForbiddenError(
      "You do not have permission to perform this action",
    );
  }
}
