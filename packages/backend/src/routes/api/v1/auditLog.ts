import { AuditLogQueryModel } from "@blurple-canvas-web/types";
import { Router } from "express";
import { requireCanvasAdmin } from "@/middleware/canvasAuth";
import { typedRouter } from "@/middleware/typedRouter";
import { validate } from "@/middleware/validate";
import { getAuditLog } from "@/services/auditLogService";

export const auditLogRouter = typedRouter(Router());

auditLogRouter.use(requireCanvasAdmin);

auditLogRouter.get(
  "/",
  validate({ query: AuditLogQueryModel }),
  async (req, res) => {
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
  },
);
