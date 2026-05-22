import z from "zod";
import BadRequestError from "@/errors/BadRequestError";

export const DiscordSnowflakeSchema = z
  .string()
  .regex(/^\d{16,20}$/, "must be a Discord snowflake");

export function assertIsSnowflake(value: string, fieldName: string): void {
  if (!DiscordSnowflakeSchema.safeParse(value).success) {
    throw new BadRequestError(`${fieldName} must be a Discord snowflake`);
  }
}
