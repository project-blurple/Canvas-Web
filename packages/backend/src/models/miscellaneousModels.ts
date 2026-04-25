import z from "zod";
import BadRequestError from "@/errors/BadRequestError";

const GuildIdParamModel = z.object({
  guildId: z.string().regex(/^\d+$/, "guildId must be a numeric string"),
});

export interface GuildIdParam {
  guildId: string;
}

export async function parseGuildId(params: GuildIdParam): Promise<bigint> {
  const result = await GuildIdParamModel.safeParseAsync(params);
  if (!result.success) {
    throw new BadRequestError(
      `${params.guildId} is not a valid guild ID`,
      result.error.issues,
    );
  }

  return BigInt(result.data.guildId);
}
