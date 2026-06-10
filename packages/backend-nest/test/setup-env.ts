// Required env vars must exist before AppModule is imported, because
// @nestjs/config validates the environment when the module file is evaluated.
process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test";
process.env.DISCORD_CLIENT_ID ??= "client-id";
process.env.DISCORD_CLIENT_SECRET ??= "client-secret";
