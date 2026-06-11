import type { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import request from "supertest";
import type TestAgent from "supertest/lib/agent";

import { AppModule } from "@/app.module";
import { configureApp } from "@/app.setup";
import { testPrisma } from "@/test/database";
import {
  ADMIN_ROLE_ID,
  expectedGuildFlags,
  MANAGED_GUILD_ID,
  MOCK_DISCORD_AVATAR_HASH,
  MOCK_DISCORD_USER_ID,
  MOCK_DISCORD_USERNAME,
  mockDiscord,
  mockDiscordServer,
  onUnhandledRequest,
  resetMockDiscord,
  VALID_OAUTH_CODE,
} from "./mock-discord";

const FRONTEND_URL = "http://localhost:3000";

describe("Discord auth (e2e)", () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    mockDiscordServer.listen({ onUnhandledRequest });

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = configureApp(
      moduleRef.createNestApplication<NestExpressApplication>(),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    mockDiscordServer.close();
  });

  afterEach(() => {
    mockDiscordServer.resetHandlers();
    resetMockDiscord();
  });

  function getSetCookies(response: request.Response): string[] {
    const setCookie = response.headers["set-cookie"];
    // supertest types this as string, but Node returns an array for set-cookie
    return Array.isArray(setCookie) ? setCookie : [setCookie];
  }

  /**
   * Runs the OAuth callback leg on the agent so it holds a logged-in session,
   * then waits for the fire-and-forget guild-record sync (it runs after the
   * redirect is sent) so it cannot race the per-test transaction rollback.
   */
  async function signIn(agent: TestAgent): Promise<request.Response> {
    const response = await agent.get(
      `/api/v1/discord/callback?code=${VALID_OAUTH_CODE}`,
    );

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe(FRONTEND_URL);

    await vi.waitFor(async () => {
      expect(await testPrisma.discordGuildRecord.count()).toBe(
        Object.keys(expectedGuildFlags).length,
      );
    });

    return response;
  }

  describe("GET /api/v1/discord", () => {
    it("redirects to the Discord authorize endpoint", async () => {
      const response = await request(app.getHttpServer()).get(
        "/api/v1/discord",
      );

      expect(response.status).toBe(302);

      const location = new URL(response.headers.location);
      expect(`${location.origin}${location.pathname}`).toBe(
        "https://discord.com/api/oauth2/authorize",
      );
      expect(location.searchParams.get("response_type")).toBe("code");
      expect(location.searchParams.get("client_id")).toBe("client-id");
      expect(location.searchParams.get("scope")).toBe(
        "identify guilds guilds.members.read",
      );
    });
  });

  describe("GET /api/v1/discord/callback", () => {
    it("logs the user in, persists the session and redirects home", async () => {
      const agent = request.agent(app.getHttpServer());
      const response = await signIn(agent);

      const cookies = getSetCookies(response);
      const sessionCookie = cookies.find((cookie) =>
        cookie.startsWith("connect.sid="),
      );
      expect(sessionCookie).toContain("HttpOnly");

      // The whole session (tokens + guild flags) lives in Postgres.
      expect(await testPrisma.session.count()).toBe(1);
    });

    it("sets the non-httpOnly profile cookie with the canvas role flags", async () => {
      const agent = request.agent(app.getHttpServer());
      const response = await signIn(agent);

      const profileCookie = getSetCookies(response).find((cookie) =>
        cookie.startsWith("profile="),
      );
      expect(profileCookie).toBeDefined();
      // The frontend reads this cookie, so it must stay non-httpOnly.
      expect(profileCookie).not.toContain("HttpOnly");
      expect(profileCookie).toContain("Secure");

      const [profileValue] = (profileCookie as string)
        .slice("profile=".length)
        .split(";");
      expect(JSON.parse(decodeURIComponent(profileValue))).toStrictEqual({
        id: MOCK_DISCORD_USER_ID,
        username: MOCK_DISCORD_USERNAME,
        profilePictureUrl: `https://cdn.discordapp.com/avatars/${MOCK_DISCORD_USER_ID}/${MOCK_DISCORD_AVATAR_HASH}.png`,
        isCanvasAdmin: false,
        isCanvasModerator: true,
      });
    });

    it("marks admins as both canvas admin and moderator", async () => {
      mockDiscord.memberRoles = [ADMIN_ROLE_ID];

      const agent = request.agent(app.getHttpServer());
      const response = await signIn(agent);

      const profileCookie = getSetCookies(response).find((cookie) =>
        cookie.startsWith("profile="),
      ) as string;
      const [profileValue] = profileCookie
        .slice("profile=".length)
        .split(";");

      expect(JSON.parse(decodeURIComponent(profileValue))).toMatchObject({
        isCanvasAdmin: true,
        isCanvasModerator: true,
      });
    });

    it("upserts the Discord profile", async () => {
      const agent = request.agent(app.getHttpServer());
      await signIn(agent);

      const profile = await testPrisma.discordUserProfile.findFirst({
        where: { userId: BigInt(MOCK_DISCORD_USER_ID) },
      });

      expect(profile?.username).toBe(MOCK_DISCORD_USERNAME);
      expect(profile?.profilePictureUrl).toBe(
        `https://cdn.discordapp.com/avatars/${MOCK_DISCORD_USER_ID}/${MOCK_DISCORD_AVATAR_HASH}.png`,
      );
    });

    it("redirects to the signin page when Discord reports a failure", async () => {
      const response = await request(app.getHttpServer()).get(
        "/api/v1/discord/callback?error=access_denied",
      );

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe(`${FRONTEND_URL}/signin`);
    });

    it("returns the parity 500 envelope when the code exchange fails", async () => {
      const response = await request(app.getHttpServer()).get(
        "/api/v1/discord/callback?code=wrong-code",
      );

      expect(response.status).toBe(500);
      expect(response.body).toStrictEqual({
        message: "An unexpected error occurred",
      });
    });
  });

  describe("POST /api/v1/discord/logout", () => {
    it("logs the user out", async () => {
      const agent = request.agent(app.getHttpServer());
      await signIn(agent);

      const logoutResponse = await agent.post("/api/v1/discord/logout");
      expect(logoutResponse.status).toBe(204);

      const afterLogout = await agent.get(
        "/api/v1/discord/guilds/permissions-map",
      );
      expect(afterLogout.status).toBe(401);
    });
  });

  describe("GET /api/v1/discord/guilds/:guildId/permissions", () => {
    it("rejects unauthenticated requests", async () => {
      const response = await request(app.getHttpServer()).get(
        `/api/v1/discord/guilds/${MANAGED_GUILD_ID}/permissions`,
      );

      expect(response.status).toBe(401);
      expect(response.body).toStrictEqual({
        message: "User is not authenticated",
      });
    });

    it("returns the permission summary for a guild", async () => {
      const agent = request.agent(app.getHttpServer());
      await signIn(agent);

      const response = await agent.get(
        `/api/v1/discord/guilds/${MANAGED_GUILD_ID}/permissions`,
      );

      expect(response.status).toBe(200);
      expect(response.body).toStrictEqual({
        administrator: false,
        manage_guild: true,
      });
    });

    it("rejects guild ids that are not snowflakes", async () => {
      const agent = request.agent(app.getHttpServer());
      await signIn(agent);

      const response = await agent.get(
        "/api/v1/discord/guilds/not-a-snowflake/permissions",
      );

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Invalid request data");
      expect(response.body.errors[0].path).toEqual(["guildId"]);
    });

    it("returns 404 for guilds the user is not in", async () => {
      const agent = request.agent(app.getHttpServer());
      await signIn(agent);

      const response = await agent.get(
        "/api/v1/discord/guilds/999999999999999999/permissions",
      );

      expect(response.status).toBe(404);
    });
  });

  describe("GET /api/v1/discord/guilds/permissions-map", () => {
    it("rejects unauthenticated requests", async () => {
      const response = await request(app.getHttpServer()).get(
        "/api/v1/discord/guilds/permissions-map",
      );

      expect(response.status).toBe(401);
      expect(response.body).toStrictEqual({
        message: "User is not authenticated",
      });
    });

    it("serves the guild flags from the session cache", async () => {
      const agent = request.agent(app.getHttpServer());
      await signIn(agent);
      // The login verify callback fetched the guild list exactly once.
      expect(mockDiscord.callCounts.guilds).toBe(1);

      const first = await agent.get("/api/v1/discord/guilds/permissions-map");
      expect(first.status).toBe(200);
      expect(first.body).toStrictEqual({ guilds: expectedGuildFlags });

      const second = await agent.get("/api/v1/discord/guilds/permissions-map");
      expect(second.status).toBe(200);
      expect(second.body).toStrictEqual({ guilds: expectedGuildFlags });

      // Both requests were served from the 15-minute session cache.
      expect(mockDiscord.callCounts.guilds).toBe(1);
    });
  });

  describe("POST /api/v1/discord/guilds/refresh", () => {
    it("rejects unauthenticated requests", async () => {
      const response = await request(app.getHttpServer()).post(
        "/api/v1/discord/guilds/refresh",
      );

      expect(response.status).toBe(401);
    });

    it("forces a refetch and syncs the guild records", async () => {
      const agent = request.agent(app.getHttpServer());
      await signIn(agent);
      expect(mockDiscord.callCounts.guilds).toBe(1);

      const managedGuild = mockDiscord.guilds.find(
        (guild) => guild.id === MANAGED_GUILD_ID,
      );
      expect(managedGuild).toBeDefined();
      if (managedGuild) managedGuild.name = "Renamed Guild";

      const response = await agent.post("/api/v1/discord/guilds/refresh");

      expect(response.status).toBe(200);
      expect(response.body.guilds[MANAGED_GUILD_ID]).toStrictEqual({
        ...expectedGuildFlags[MANAGED_GUILD_ID],
        name: "Renamed Guild",
      });
      // Bypassed the session cache.
      expect(mockDiscord.callCounts.guilds).toBe(2);

      // The guild-record sync runs after the response is sent.
      await vi.waitFor(async () => {
        const record = await testPrisma.discordGuildRecord.findFirst({
          where: { guildId: BigInt(MANAGED_GUILD_ID) },
        });
        expect(record?.name).toBe("Renamed Guild");
      });

      // The refreshed flags replace the session cache.
      const followUp = await agent.get(
        "/api/v1/discord/guilds/permissions-map",
      );
      expect(followUp.status).toBe(200);
      expect(followUp.body.guilds[MANAGED_GUILD_ID].name).toBe(
        "Renamed Guild",
      );
      expect(mockDiscord.callCounts.guilds).toBe(2);
    });
  });
});
