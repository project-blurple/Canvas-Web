import { Router } from "express";
import { ApiError } from "@/errors";
import { getNotices } from "@/services/noticeService";

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

noticeRouter.post("/", async (_req, res) => {
  // admin auth
  res.status(501).json({ message: "Not implemented" });
});

noticeRouter.put("/:noticeId", async (_req, res) => {
  // admin auth
  res.status(501).json({ message: "Not implemented" });
});

noticeRouter.delete("/:noticeId", async (_req, res) => {
  // admin auth
  res.status(501).json({ message: "Not implemented" });
});
