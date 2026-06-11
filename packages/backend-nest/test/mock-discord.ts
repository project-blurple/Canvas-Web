import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";

/**
 * msw-backed stand-in for the Discord API, covering everything the auth stack
 * talks to: the OAuth2 token endpoint and identity lookup (hit by
 * `discord-strategy` over Node's http module) plus the v10 guild endpoints
 * (hit by `DiscordGuildService` over fetch).
 */

export const MOCK_DISCORD_USER_ID = "204778476102877187";
export const MOCK_DISCORD_USERNAME = "tester";
export const MOCK_DISCORD_AVATAR_HASH = "a1b2c3d4";

/** Must match `DISCORD_MANAGEMENT_GUILD_ID` etc. from `setup-env.ts`. */
export const MANAGEMENT_GUILD_ID = "222222222222222222";
export const ADMIN_ROLE_ID = "333333333333333333";
export const MODERATOR_ROLE_ID = "444444444444444444";

export const MANAGED_GUILD_ID = "555555555555555555";
export const PLAIN_GUILD_ID = "666666666666666666";

export const VALID_OAUTH_CODE = "valid-oauth-code";
export const MOCK_ACCESS_TOKEN = "mock-access-token";
export const MOCK_REFRESH_TOKEN = "mock-refresh-token";

interface MockGuild {
  id: string;
  name: string;
  owner_id: string;
  permissions: string;
  approximate_member_count?: number;
}

function defaultGuilds(): MockGuild[] {
  return [
    {
      id: MANAGEMENT_GUILD_ID,
      name: "Management Guild",
      owner_id: "111111111111111111",
      permissions: "8", // ADMINISTRATOR
      approximate_member_count: 42,
    },
    {
      id: MANAGED_GUILD_ID,
      name: "Managed Guild",
      owner_id: "111111111111111111",
      permissions: "32", // MANAGE_GUILD
      approximate_member_count: 7,
    },
    {
      id: PLAIN_GUILD_ID,
      name: "Plain Guild",
      owner_id: "111111111111111111",
      permissions: "0",
      // no approximate_member_count -> memberCount null
    },
  ];
}

export const mockDiscord = {
  /** Roles returned by the management-guild member endpoint. */
  memberRoles: [MODERATOR_ROLE_ID],
  guilds: defaultGuilds(),
  callCounts: { token: 0, profile: 0, guilds: 0, member: 0 },
};

export function resetMockDiscord(): void {
  mockDiscord.memberRoles = [MODERATOR_ROLE_ID];
  mockDiscord.guilds = defaultGuilds();
  mockDiscord.callCounts = { token: 0, profile: 0, guilds: 0, member: 0 };
}

/** The guild-flags map the backend should derive from {@link defaultGuilds}. */
export const expectedGuildFlags = {
  [MANAGEMENT_GUILD_ID]: {
    name: "Management Guild",
    memberCount: 42,
    administrator: true,
    manageGuild: true,
  },
  [MANAGED_GUILD_ID]: {
    name: "Managed Guild",
    memberCount: 7,
    administrator: false,
    manageGuild: true,
  },
  [PLAIN_GUILD_ID]: {
    name: "Plain Guild",
    memberCount: null,
    administrator: false,
    manageGuild: false,
  },
};

function unauthorized() {
  return HttpResponse.json(
    { message: "401: Unauthorized", code: 0 },
    { status: 401 },
  );
}

function isAuthorized(request: Request): boolean {
  return request.headers.get("authorization") === `Bearer ${MOCK_ACCESS_TOKEN}`;
}

const handlers = [
  http.post("https://discord.com/api/oauth2/token", async ({ request }) => {
    mockDiscord.callCounts.token += 1;
    const body = new URLSearchParams(await request.text());

    if (body.get("grant_type") === "authorization_code") {
      if (body.get("code") !== VALID_OAUTH_CODE) {
        return HttpResponse.json({ error: "invalid_grant" }, { status: 400 });
      }
    } else if (body.get("refresh_token") !== MOCK_REFRESH_TOKEN) {
      return HttpResponse.json({ error: "invalid_grant" }, { status: 400 });
    }

    return HttpResponse.json({
      access_token: MOCK_ACCESS_TOKEN,
      refresh_token: MOCK_REFRESH_TOKEN,
      token_type: "Bearer",
      expires_in: 604_800,
      scope: "identify guilds guilds.members.read",
    });
  }),

  // discord-strategy's userProfile (unversioned API base)
  http.get("https://discord.com/api/users/@me", ({ request }) => {
    mockDiscord.callCounts.profile += 1;
    if (!isAuthorized(request)) return unauthorized();

    return HttpResponse.json({
      id: MOCK_DISCORD_USER_ID,
      username: MOCK_DISCORD_USERNAME,
      avatar: MOCK_DISCORD_AVATAR_HASH,
      discriminator: "0",
    });
  }),

  http.get("https://discord.com/api/v10/users/@me/guilds", ({ request }) => {
    mockDiscord.callCounts.guilds += 1;
    if (!isAuthorized(request)) return unauthorized();

    return HttpResponse.json(mockDiscord.guilds);
  }),

  http.get(
    "https://discord.com/api/v10/users/@me/guilds/:guildId/member",
    ({ request, params }) => {
      mockDiscord.callCounts.member += 1;
      if (!isAuthorized(request)) return unauthorized();

      if (params.guildId !== MANAGEMENT_GUILD_ID) {
        return HttpResponse.json(
          { message: "Unknown Guild", code: 10004 },
          { status: 404 },
        );
      }

      return HttpResponse.json({
        user: { id: MOCK_DISCORD_USER_ID },
        roles: mockDiscord.memberRoles,
      });
    },
  ),
];

export const mockDiscordServer = setupServer(...handlers);

/**
 * Anything that is not Discord (i.e. supertest's requests to the local app)
 * must pass through untouched; unmocked Discord calls are a test bug.
 */
export const onUnhandledRequest = (
  request: Request,
  print: { warning(): void; error(): void },
): void => {
  if (new URL(request.url).hostname.endsWith("discord.com")) {
    print.error();
  }
};
