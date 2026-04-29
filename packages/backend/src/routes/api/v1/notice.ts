import { Router } from "express";
import { ApiError, BadRequestError } from "@/errors";
import { ModifyNoticeBodyModel, parseNoticeId } from "@/models/notice.models";
import {
  createNotice,
  deleteNotice,
  getNotices,
  updateNotice,
} from "@/services/noticeService";

export const noticeRouter = Router();

noticeRouter.get("/", async (_req, res) => {
  try {
    const notices = await getNotices(true);
    res.status(200).json(notices);
  } catch (error) {
    ApiError.sendError(res, error);
  }
});

noticeRouter.get("/all", async (_req, res) => {
  try {
    // TODO: admin auth here
    const notices = await getNotices(false);
    res.status(200).json(notices);
  } catch (error) {
    ApiError.sendError(res, error);
  }
});

noticeRouter.post("/", async (req, res) => {
  try {
    // TODO: admin auth here

    const bodyQueryResult = await ModifyNoticeBodyModel.safeParseAsync(
      req.body,
    );
    if (!bodyQueryResult.success) {
      throw new BadRequestError(
        "Invalid request body",
        bodyQueryResult.error.issues,
      );
    }

    const notice = await createNotice(bodyQueryResult.data);
    res.status(201).json(notice);
  } catch (error) {
    ApiError.sendError(res, error);
  }
});

noticeRouter.put("/:noticeId", async (req, res) => {
  try {
    // TODO: admin auth here

    const noticeId = await parseNoticeId(req.body);

    const bodyQueryResult = await ModifyNoticeBodyModel.safeParseAsync(
      req.body,
    );
    if (!bodyQueryResult.success) {
      throw new BadRequestError(
        "Invalid request body",
        bodyQueryResult.error.issues,
      );
    }

    const notice = await updateNotice({
      noticeId,
      ...bodyQueryResult.data,
    });
    res.status(200).json(notice);
  } catch (error) {
    ApiError.sendError(res, error);
  }
});

noticeRouter.delete("/:noticeId", async (req, res) => {
  try {
    // TODO: admin auth

    const noticeId = await parseNoticeId(req.body);

    await deleteNotice(noticeId);
    res.status(204).end();
  } catch (error) {
    ApiError.sendError(res, error);
  }
});
