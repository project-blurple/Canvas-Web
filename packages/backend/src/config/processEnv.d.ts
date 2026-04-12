/**
 * Use module augmentation to include the environment variables to the `process.env` object.
 */
declare namespace NodeJS {
  export interface ProcessEnv {
    PORT?: string;
    NODE_ENV?: string;
    DISCORD_CLIENT_ID?: string;
    DISCORD_CLIENT_SECRET?: string;
    DISCORD_BOT_TOKEN?: string;
    DISCORD_MANAGEMENT_GUILD_ID?: string;
    DISCORD_ADMIN_ROLE_ID?: string;
    DISCORD_MODERATOR_ROLE_ID?: string;
  }
}
