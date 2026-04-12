import BadRequestError from "@/errors/BadRequestError";
import BotNotInGuildError from "@/errors/BotNotInGuildError";
import NotFoundError from "@/errors/NotFoundError";
import UnauthorizedError from "@/errors/UnauthorizedError";

const DISCORD_API_BASE_URL = "https://discord.com/api/v10";
const ADMINISTRATOR_PERMISSION = 0x8n;
const MANAGE_GUILD_PERMISSION = 0x20n;

interface DiscordGuild {
  id: string;
  owner_id: string;
}

interface DiscordGuildRole {
  id: string;
  permissions: string;
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
  botToken: string;
}

async function discordRequest<T>({
  endpoint,
  botToken,
}: DiscordRequestOptions): Promise<T> {
  const response = await fetch(`${DISCORD_API_BASE_URL}${endpoint}`, {
    headers: {
      Authorization: `Bot ${botToken}`,
    },
  });

  if (response.status === 401 || response.status === 403) {
    throw new UnauthorizedError(
      "Discord bot token is invalid or missing permissions",
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

async function ensureBotInGuild(
  guildId: string,
  botToken: string,
): Promise<DiscordGuild> {
  try {
    return await discordRequest<DiscordGuild>({
      endpoint: `/guilds/${guildId}`,
      botToken,
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw new BotNotInGuildError(guildId);
    }

    throw error;
  }
}

export async function getGuildPermissionsForUser(
  guildId: string,
  userId: string,
  botToken: string,
): Promise<GuildPermissionsSummary> {
  const guild = await ensureBotInGuild(guildId, botToken);

  const [member, roles] = await Promise.all([
    discordRequest<DiscordGuildMember>({
      endpoint: `/guilds/${guildId}/members/${userId}`,
      botToken,
    }),
    discordRequest<DiscordGuildRole[]>({
      endpoint: `/guilds/${guildId}/roles`,
      botToken,
    }),
  ]);

  if (guild.owner_id === userId) {
    return {
      administrator: true,
      manage_guild: true,
    };
  }

  const rolePermissionsById = new Map(
    roles.map((role) => [role.id, BigInt(role.permissions)]),
  );

  const everyonePermissions = rolePermissionsById.get(guild.id) ?? 0n;
  const combinedPermissions = member.roles.reduce((permissions, roleId) => {
    return permissions | (rolePermissionsById.get(roleId) ?? 0n);
  }, everyonePermissions);

  const administrator =
    (combinedPermissions & ADMINISTRATOR_PERMISSION) ===
    ADMINISTRATOR_PERMISSION;
  const manageGuild =
    administrator ||
    (combinedPermissions & MANAGE_GUILD_PERMISSION) === MANAGE_GUILD_PERMISSION;

  return {
    administrator,
    manage_guild: manageGuild,
  };
}
