import type { z } from "zod";
import type { AuditLogPageSchema } from "../auditLog.js";
import type { AuditLogQueryModel } from "../models/index.js";

export type Params = Record<string, never>;
export type ResBody = z.infer<typeof AuditLogPageSchema>;
export type ReqBody = Record<string, never>;
export type ReqQuery = z.input<typeof AuditLogQueryModel>;
