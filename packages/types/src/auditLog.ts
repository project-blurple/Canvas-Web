import z from "zod";

export const AUDIT_ACTOR_ROLES = ["admin", "moderator"] as const;
export const AuditActorRoleSchema = z.enum(AUDIT_ACTOR_ROLES);
export type AuditActorRole = z.infer<typeof AuditActorRoleSchema>;

export const AUDIT_ACTIONS_BY_RESOURCE = {
  blocklist: ["add", "remove"],
  canvas: ["create", "update", "paste", "clearCache"],
  color: ["create", "update", "delete"],
  event: ["create", "update"],
  notice: ["create", "update", "delete"],
  participation: ["assign", "unassign"],
  pixel_history: ["delete"],
} as const;

export type AuditResourceType = keyof typeof AUDIT_ACTIONS_BY_RESOURCE;

export const AUDIT_RESOURCE_TYPES = Object.keys(
  AUDIT_ACTIONS_BY_RESOURCE,
) as readonly AuditResourceType[];

export type AuditAction = {
  [R in AuditResourceType]: `${R}.${(typeof AUDIT_ACTIONS_BY_RESOURCE)[R][number]}`;
}[AuditResourceType];

export const AUDIT_ACTIONS: readonly AuditAction[] = Object.entries(
  AUDIT_ACTIONS_BY_RESOURCE,
).flatMap(([resource, verbs]) =>
  verbs.map((verb) => `${resource}.${verb}` as AuditAction),
);

export type ResourceTypeOfAction<Action extends AuditAction> =
  Action extends `${infer Resource extends AuditResourceType}.${string}` ?
    Resource
  : never;

export const AuditLogEntrySchema = z.object({
  id: z.string(),
  createdAt: z.iso.datetime(),
  actorId: z.string().regex(/^\d+$/),
  actorRole: AuditActorRoleSchema,
  actorUsername: z.string().nullable(),
  actorProfilePictureUrl: z.string().nullable(),
  action: z.string(),
  resourceType: z.string().nullable(),
  resourceId: z.string().nullable(),
  metadata: z.unknown(),
});

export type AuditLogEntry = z.infer<typeof AuditLogEntrySchema>;

export const AuditLogPageSchema = z.object({
  entries: z.array(AuditLogEntrySchema),
  nextCursor: z.string().nullable(),
});

export type AuditLogPage = z.infer<typeof AuditLogPageSchema>;
