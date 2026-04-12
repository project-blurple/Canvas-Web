import config from "@/config";
import ApiError from "@/errors/ApiError";
import BadRequestError from "@/errors/BadRequestError";

const DiscordSnowflakePattern = /^\d+$/;

export function validateSnowflake(value: string, fieldName: string): void {
  if (!DiscordSnowflakePattern.test(value)) {
    throw new BadRequestError(`${fieldName} must be a Discord snowflake`);
  }
}

export function getDiscordBotToken(): string {
  const botToken = config.discord.botToken;
  if (!botToken) {
    throw new ApiError(
      "Discord bot token is not configured. Set DISCORD_BOT_TOKEN.",
      500,
    );
  }

  return botToken;
}
