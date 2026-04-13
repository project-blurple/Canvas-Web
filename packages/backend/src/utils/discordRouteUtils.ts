import BadRequestError from "@/errors/BadRequestError";

const DiscordSnowflakePattern = /^\d+$/;

export function validateSnowflake(value: string, fieldName: string): void {
  if (!DiscordSnowflakePattern.test(value)) {
    throw new BadRequestError(`${fieldName} must be a Discord snowflake`);
  }
}
