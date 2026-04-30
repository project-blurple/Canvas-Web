import type { BlocklistEntry } from "@blurple-canvas-web/types";
import z from "zod";
import { BadRequestError } from "@/errors";
import { assertZodSuccess } from "@/utils/models";

const snowflakeString = z
  .string()
  .regex(/^\d+$/, "userId must be a numeric string");

const BlocklistParamModel = z.object({
  userId: z.union([snowflakeString, z.array(snowflakeString)]).optional(),
});

export async function parseBlocklistParams(params: {
  userId?: string | string[];
}): Promise<BlocklistEntry["userId"][]> {
  const result = await BlocklistParamModel.safeParseAsync(params);
  assertZodSuccess(result);
  const { userId } = result.data;
  if (!userId) {
    throw new BadRequestError("userId is required");
  }
  const ids = Array.isArray(userId) ? userId : [userId];
  return ids.map(BigInt);
}
