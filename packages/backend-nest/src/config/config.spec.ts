import { appConfig } from "./app.config";
import { captchaConfig } from "./captcha.config";
import { databaseConfig } from "./database.config";
import { discordConfig } from "./discord.config";
import { validateEnv } from "./env";
import { framesConfig } from "./frames.config";
import { placementConfig } from "./placement.config";
import { sessionConfig } from "./session.config";

const REQUIRED_ENV = {
  DATABASE_URL: "postgresql://test:test@localhost:5432/test",
  DISCORD_CLIENT_ID: "client-id",
  DISCORD_CLIENT_SECRET: "client-secret",
};

describe("config", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    Object.assign(process.env, REQUIRED_ENV);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("validateEnv", () => {
    it.each(Object.keys(REQUIRED_ENV))(
      "throws when required variable %s is missing",
      (key) => {
        delete process.env[key];
        expect(() => validateEnv(process.env)).toThrow(key);
      },
    );

    it("treats empty environment variables as unset", () => {
      process.env.PORT = "";
      process.env.FRONTEND_URL = "";

      const env = validateEnv(process.env);

      expect(env.PORT).toBe(8000);
      expect(env.FRONTEND_URL).toBe("http://localhost:3000");
    });

    it("rejects non-numeric numeric variables", () => {
      process.env.PORT = "not-a-port";
      expect(() => validateEnv(process.env)).toThrow("PORT");
    });
  });

  describe("appConfig", () => {
    it("applies the documented defaults", () => {
      expect(appConfig()).toMatchObject({
        environment: "production",
        port: 8000,
        frontendUrl: "http://localhost:3000",
      });
    });

    it("parses numeric overrides", () => {
      process.env.PORT = "9123";
      expect(appConfig().port).toBe(9123);
    });
  });

  describe("databaseConfig", () => {
    it("exposes the database url", () => {
      expect(databaseConfig().url).toBe(REQUIRED_ENV.DATABASE_URL);
    });
  });

  describe("discordConfig", () => {
    it("exposes credentials and leaves management settings unset by default", () => {
      expect(discordConfig()).toEqual({
        clientId: "client-id",
        clientSecret: "client-secret",
        managementGuildId: undefined,
        adminRoleId: undefined,
        moderatorRoleId: undefined,
        serverInvite: undefined,
      });
    });
  });

  describe("sessionConfig", () => {
    it("defaults to the documented development secret", () => {
      expect(sessionConfig().secret).toBe("change the secret in production");
    });

    it("disables secure cookies only in development (Safari over HTTP)", () => {
      expect(sessionConfig().secureCookies).toBe(true);

      process.env.NODE_ENV = "development";
      expect(sessionConfig().secureCookies).toBe(false);
    });
  });

  describe("placementConfig", () => {
    it("applies the documented defaults", () => {
      expect(placementConfig()).toMatchObject({
        webGuildId: 0,
        webPlacingEnabled: false,
        botPlacingEnabled: true,
      });
    });

    it("parses the placement feature flags with their exact semantics", () => {
      process.env.WEB_PLACING_ENABLED = "true";
      process.env.BOT_PLACING_ENABLED = "false";
      expect(placementConfig()).toMatchObject({
        webPlacingEnabled: true,
        botPlacingEnabled: false,
      });

      // Anything other than the exact literals falls back to the defaults.
      process.env.WEB_PLACING_ENABLED = "TRUE";
      process.env.BOT_PLACING_ENABLED = "no";
      expect(placementConfig()).toMatchObject({
        webPlacingEnabled: false,
        botPlacingEnabled: true,
      });
    });
  });

  describe("framesConfig", () => {
    it("defaults both frame caps to 32", () => {
      expect(framesConfig()).toEqual({
        maxAllowedUser: 32,
        maxAllowedGuild: 32,
      });
    });

    it("parses numeric overrides", () => {
      process.env.MAX_USER_FRAMES_ALLOWED = "5";
      process.env.MAX_GUILD_FRAMES_ALLOWED = "7";
      expect(framesConfig()).toEqual({
        maxAllowedUser: 5,
        maxAllowedGuild: 7,
      });
    });
  });

  describe("captchaConfig", () => {
    it("is disabled by default and only enabled by the exact literal", () => {
      expect(captchaConfig().enabled).toBe(false);

      process.env.CAPTCHA_ENABLED = "true";
      expect(captchaConfig().enabled).toBe(true);
    });
  });
});
