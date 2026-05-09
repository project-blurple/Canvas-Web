import { Router } from "express";
import { ApiError, BadRequestError } from "@/errors";
import { requireCanvasAdmin } from "@/middleware/canvasAuth";
import { ModifyNoticeBodyModel, parseNoticeId } from "@/models/notice.models";
import {
  createNotice,
  deleteNotice,
  getNotices,
  updateNotice,
} from "@/services/noticeService";
import { assertZodSuccess } from "@/utils/models";

export const noticeRouter = Router();

noticeRouter.get("/", async (_req, res) => {
  try {
    const notices = await getNotices(true);
    res.status(200).json(notices);
  } catch (error) {
    ApiError.sendError(res, error);
  }
});

noticeRouter.get("/all", requireCanvasAdmin, async (_req, res) => {
  try {
    const notices = await getNotices(false);
    res.status(200).json(notices);
  } catch (error) {
    ApiError.sendError(res, error);
  }
});

noticeRouter.post("/", requireCanvasAdmin, async (req, res) => {
  try {
    const bodyQueryResult = await ModifyNoticeBodyModel.safeParseAsync(
      req.body,
    );
    assertZodSuccess(bodyQueryResult);

    const notice = await createNotice(bodyQueryResult.data);
    res.status(201).json(notice);
  } catch (error) {
    ApiError.sendError(res, error);
  }
});

noticeRouter.put("/:noticeId", requireCanvasAdmin, async (req, res) => {
  try {
    const noticeId = await parseNoticeId(req.body);

    const bodyQueryResult = await ModifyNoticeBodyModel.safeParseAsync(
      req.body,
    );
    assertZodSuccess(bodyQueryResult);

    const notice = await updateNotice({
      noticeId,
      data: bodyQueryResult.data,
    });
    res.status(200).json(notice);
  } catch (error) {
    ApiError.sendError(res, error);
  }
});

noticeRouter.delete("/:noticeId", requireCanvasAdmin, async (req, res) => {
  try {
    const noticeId = await parseNoticeId(req.body);

    await deleteNotice(noticeId);
    res.status(204).end();
  } catch (error) {
    ApiError.sendError(res, error);
  }
});
