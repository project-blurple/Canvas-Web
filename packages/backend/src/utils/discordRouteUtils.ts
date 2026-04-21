import BadRequestError from "@/errors/BadRequestError";

const discordSnowflakePattern = /^\d{16,20}$/;

export function assertIsSnowflake(value: string, fieldName: string): void {
  if (!discordSnowflakePattern.test(value)) {
    throw new BadRequestError(`${fieldName} must be a Discord snowflake`);
  }
}
