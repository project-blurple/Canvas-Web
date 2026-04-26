import { BlacklistEntry } from "@blurple-canvas-web/types";
import z from "zod";
import { BadRequestError } from "@/errors";

const snowflakeString = z
  .string()
  .regex(/^\d+$/, "userId must be a numeric string");

const BlacklistParamModel = z.object({
  userId: z.union([snowflakeString, z.array(snowflakeString)]).optional(),
});

export async function parseBlacklistParams(params: {
  userId?: string | string[];
}): Promise<BlacklistEntry["userId"][]> {
  const result = await BlacklistParamModel.safeParseAsync(params);
  if (!result.success) {
    throw new BadRequestError(
      `Invalid blacklist parameters: ${result.error.message}`,
      result.error.issues,
    );
  }
  const { userId } = result.data;
  if (!userId) {
    throw new BadRequestError("userId is required");
  }
  if (Array.isArray(userId)) {
    return userId.map((id) => BigInt(id));
  }
  return [BigInt(userId)];
}
