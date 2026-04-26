import { Router } from "express";
import { ApiError } from "@/errors";
import { parseBlacklistParams } from "@/models/blacklistModels";
import {
  addUsersToBlacklist,
  getBlacklist,
  removeUsersFromBlacklist,
} from "@/services/blacklistService";
import { assertCanvasModerator } from "@/services/discordGuildService";
import { assertLoggedIn } from "@/utils";

export const blacklistRouter = Router();

blacklistRouter.get("/", async (req, res) => {
  try {
    assertLoggedIn(req);
    assertCanvasModerator(req.user);

    const blacklist = await getBlacklist();

    res.status(200).json(blacklist);
  } catch (error) {
    ApiError.sendError(res, error);
  }
});

blacklistRouter.post("/", async (req, res) => {
  try {
    assertLoggedIn(req);
    assertCanvasModerator(req.user);
    const userIds = await parseBlacklistParams(req.body);

    await addUsersToBlacklist(userIds);

    res.status(200).json({ message: "Users added to blacklist" });
  } catch (error) {
    ApiError.sendError(res, error);
  }
});

blacklistRouter.delete("/", async (req, res) => {
  try {
    assertLoggedIn(req);
    assertCanvasModerator(req.user);
    const userIds = await parseBlacklistParams(req.body);

    await removeUsersFromBlacklist(userIds);

    res.status(204).send();
  } catch (error) {
    ApiError.sendError(res, error);
  }
});
