import { Router } from "express";
import { requireCanvasAdmin } from "@/middleware/canvasAuth";
import { typedRouter } from "@/middleware/typedRouter";
import { validate } from "@/middleware/validate";
import { NoticeBodyModel, NoticeIdParamModel } from "@/models/notice.models";
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
  },
);

noticeRouter.delete(
  "/:noticeId",
  requireCanvasAdmin,
  validate({ params: NoticeIdParamModel }),
  async (req, res) => {
    await deleteNotice(req.params.noticeId);
    res.status(204).end();
  },
);
