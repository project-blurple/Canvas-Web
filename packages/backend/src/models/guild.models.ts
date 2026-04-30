import z from "zod";
import { assertZodSuccess } from "@/utils/models";

const GuildIdParamModel = z.object({
  guildId: z.string().regex(/^\d+$/, "guildId must be a numeric string"),
});

export interface GuildIdParam {
  guildId: string;
}

export async function parseGuildId(params: GuildIdParam): Promise<bigint> {
  const result = await GuildIdParamModel.safeParseAsync(params);
  assertZodSuccess(result, `${params.guildId} is not a valid guild ID`);
  return BigInt(result.data.guildId);
}
