import { DiscordSnowflakeSchema } from "@blurple-canvas-web/types";
import BadRequestError from "@/errors/BadRequestError";

export function assertIsSnowflake(value: string, fieldName: string): void {
  if (!DiscordSnowflakeSchema.safeParse(value).success) {
    throw new BadRequestError(`${fieldName} must be a Discord snowflake`);
  }
}
