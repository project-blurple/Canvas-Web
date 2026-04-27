import { Router } from "express";
import { ApiError } from "@/errors";
import { parseBlocklistParams } from "@/models/blocklistModels";
import {
  addUsersToBlocklist,
  getBlocklist,
  removeUsersFromBlocklist,
} from "@/services/blocklistService";
import { assertIsCanvasModerator } from "@/services/discordGuildService";
import { assertLoggedIn } from "@/utils";

export const blocklistRouter = Router();

blocklistRouter.get("/", async (req, res) => {
  try {
    assertLoggedIn(req);
    assertIsCanvasModerator(req.user);

    const blocklist = await getBlocklist();

    res.status(200).json(blocklist);
  } catch (error) {
    ApiError.sendError(res, error);
  }
});

blocklistRouter.post("/", async (req, res) => {
  try {
    assertLoggedIn(req);
    assertIsCanvasModerator(req.user);
    const userIds = await parseBlocklistParams(req.body);

    await addUsersToBlocklist(userIds);

    res.status(200).json({ message: "Users added to blocklist" });
  } catch (error) {
    ApiError.sendError(res, error);
  }
});

blocklistRouter.delete("/", async (req, res) => {
  try {
    assertLoggedIn(req);
    assertIsCanvasModerator(req.user);
    const userIds = await parseBlocklistParams(req.body);

    await removeUsersFromBlocklist(userIds);

    res.status(204).send();
  } catch (error) {
    ApiError.sendError(res, error);
  }
});
