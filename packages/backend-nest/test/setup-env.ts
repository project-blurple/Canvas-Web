// Required env vars must exist before AppModule is imported, because
// @nestjs/config validates the environment when the module file is evaluated.
process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test";
process.env.DISCORD_CLIENT_ID ??= "client-id";
process.env.DISCORD_CLIENT_SECRET ??= "client-secret";

// Management-guild role checks; ids must match test/mock-discord.ts.
process.env.DISCORD_MANAGEMENT_GUILD_ID ??= "222222222222222222";
process.env.DISCORD_ADMIN_ROLE_ID ??= "333333333333333333";
process.env.DISCORD_MODERATOR_ROLE_ID ??= "444444444444444444";
