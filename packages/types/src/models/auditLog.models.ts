import z from "zod";
import { AUDIT_ACTIONS, AUDIT_RESOURCE_TYPES } from "../auditLog";

const knownActions = new Set<string>(AUDIT_ACTIONS);
const knownResourcePrefixes = new Set(AUDIT_RESOURCE_TYPES.map((r) => `${r}.`));

export const AuditLogQueryModel = z.object({
  actorId: z
    .string()
    .regex(/^\d+$/, "actorId must be a numeric string")
    .optional(),
  action: z
    .string()
    .refine(
      (s) => knownActions.has(s) || knownResourcePrefixes.has(s),
      "must be a known audit action or '<resource>.' prefix",
    )
    .optional(),
  resourceType: z.enum(AUDIT_RESOURCE_TYPES).optional(),
  resourceId: z.string().min(1).max(128).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
  cursor: z.string().min(1).optional(),
});

export type AuditLogQuery = z.infer<typeof AuditLogQueryModel>;
