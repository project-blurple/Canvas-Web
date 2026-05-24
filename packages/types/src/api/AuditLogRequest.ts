import type { z } from "zod";
import type { AuditLogPageSchema } from "../auditLog";
import type { AuditLogQueryModel } from "../models";

export type Params = Record<string, never>;
export type ResBody = z.infer<typeof AuditLogPageSchema>;
export type ReqBody = Record<string, never>;
export type ReqQuery = z.input<typeof AuditLogQueryModel>;
