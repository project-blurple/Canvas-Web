import z from "zod";

export const DiscordSnowflakeSchema = z
  .string()
  .regex(/^\d{16,20}$/, "must be a Discord snowflake");
