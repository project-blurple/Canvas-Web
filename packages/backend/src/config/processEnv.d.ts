/**
 * Use module augmentation to include the environment variables to the `process.env` object.
 */
declare namespace NodeJS {
  export interface ProcessEnv {
    PORT?: string;
    NODE_ENV?: string;
    DISCORD_CLIENT_ID?: string;
    BOT_PLACING_ENABLED?: string;
  }
}
