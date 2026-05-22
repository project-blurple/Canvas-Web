import z from "zod";

const snowflakeString = z
  .string()
  .regex(/^\d+$/, "userId must be a numeric string");

export const BlocklistBodyModel = z
  .object({
    userId: z.union([snowflakeString, z.array(snowflakeString)]),
  })
  .transform(({ userId }) =>
    (Array.isArray(userId) ? userId : [userId]).map(BigInt),
  );
