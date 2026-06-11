import { AuditLogQueryModel } from "@blurple-canvas-web/types";
import { Router } from "express";
import { requireCanvasAdmin } from "@/middleware/canvasAuth";
import { typedRouter } from "@/middleware/typedRouter";
import { validate } from "@/middleware/validate";
import { getAuditLog } from "@/services/auditLogService";
import { addSpanAttributes } from "@/utils/otel";

export const auditLogRouter = typedRouter(Router());

auditLogRouter.use(requireCanvasAdmin);

auditLogRouter.get(
  "/",
  validate({ query: AuditLogQueryModel }),
  async (req, res) => {
    addSpanAttributes(req, {
      "audit_log.query.actorId": req.query.actorId,
      "audit_log.query.action": req.query.action,
      "audit_log.query.resourceType": req.query.resourceType,
      "audit_log.query.resourceId": req.query.resourceId,
      "audit_log.query.from": req.query.from?.toISOString(),
      "audit_log.query.to": req.query.to?.toISOString(),
      "audit_log.query.limit": req.query.limit,
    });

    const page = await getAuditLog({
      actorId: req.query.actorId,
      action: req.query.action,
      resourceType: req.query.resourceType,
      resourceId: req.query.resourceId,
      from: req.query.from,
      to: req.query.to,
      limit: req.query.limit,
      cursor: req.query.cursor,
    });

    res.status(200).json(page);

    addSpanAttributes(req, { "response.size": page.entries.length });
  },
);
