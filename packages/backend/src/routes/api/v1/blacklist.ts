import { Router } from "express";
import { ApiError } from "@/errors";
import { parseBlacklistParams } from "@/models/blacklistModels";
import { addUsersToBlacklist, getBlacklist, removeUsersFromBlacklist } from "@/services/blacklistService";

export const blacklistRouter = Router();

blacklistRouter.get("/", async (_req, res) => {
  try {
    // TODO: restrict by Canvas Manager auth
    return await getBlacklist();
  } catch (error) {
    ApiError.sendError(res, error);
  }
});

blacklistRouter.post("/", async (req, res) => {
  try {
    // TODO: restrict by Canvas Manager auth
    const userIds = await parseBlacklistParams(req.body);

    await addUsersToBlacklist(userIds);

    res.status(200).json({ message: "Users added to blacklist" });
  } catch (error) {
    ApiError.sendError(res, error);
  }
});

blacklistRouter.delete("/", async (req, res) => {
  try {
    // TODO: restrict by Canvas Manager auth
    const userIds = await parseBlacklistParams(req.body);

    await removeUsersFromBlacklist(userIds);

    res.status(204);
  } catch (error) {
    ApiError.sendError(res, error);
  }
});
