import { NoticeBodyModel, NoticeIdParamModel } from "@blurple-canvas-web/types";
import { Router } from "express";
import { socketHandler } from "@/index";
import { requireCanvasAdmin } from "@/middleware/canvasAuth";
import { typedRouter } from "@/middleware/typedRouter";
import { validate } from "@/middleware/validate";
import { audit } from "@/services/auditLogService";
import {
  createNotice,
  deleteNotice,
  getNotices,
  updateNotice,
} from "@/services/noticeService";

export const noticeRouter = typedRouter(Router());

noticeRouter.get("/", async (_req, res) => {
  const notices = await getNotices(true);
  res.status(200).json(notices);
});

noticeRouter.get("/all", requireCanvasAdmin, async (_req, res) => {
  const notices = await getNotices(false);
  res.status(200).json(notices);
});

noticeRouter.post(
  "/",
  requireCanvasAdmin,
  validate({ body: NoticeBodyModel }),
  async (req, res) => {
    const notice = await createNotice(req.body);
    res.status(201).json(notice);
    void audit(req, "admin", "notice.create", {
      resourceId: notice.id,
      metadata: req.body,
    });
    socketHandler.broadcastNoticeUpdate();
  },
);

noticeRouter.put(
  "/:noticeId",
  requireCanvasAdmin,
  validate({ params: NoticeIdParamModel, body: NoticeBodyModel }),
  async (req, res) => {
    const notice = await updateNotice({
      noticeId: req.params.noticeId,
      data: req.body,
    });
    res.status(200).json(notice);
    void audit(req, "admin", "notice.update", {
      resourceId: notice.id,
      metadata: req.body,
    });
    socketHandler.broadcastNoticeUpdate();
  },
);

noticeRouter.delete(
  "/:noticeId",
  requireCanvasAdmin,
  validate({ params: NoticeIdParamModel }),
  async (req, res) => {
    await deleteNotice(req.params.noticeId);
    res.status(204).end();
    void audit(req, "admin", "notice.delete", {
      resourceId: req.params.noticeId,
    });
    socketHandler.broadcastNoticeUpdate();
  },
);
