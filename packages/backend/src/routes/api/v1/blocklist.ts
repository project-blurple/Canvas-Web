import { Router } from "express";
import { ApiError } from "@/errors";
import { requireCanvasModerator } from "@/middleware/canvasAuth";
import { parseBlocklistParams } from "@/models/blocklist.models";
import {
  addUsersToBlocklist,
  getBlocklist,
  removeUsersFromBlocklist,
} from "@/services/blocklistService";

export const blocklistRouter = Router();

blocklistRouter.use(requireCanvasModerator);

blocklistRouter.get("/", async (_req, res) => {
  try {
    const blocklist = await getBlocklist();

    res.status(200).json(blocklist);
  } catch (error) {
    ApiError.sendError(res, error);
  }
});

blocklistRouter.put("/", async (req, res) => {
  try {
    const userIds = await parseBlocklistParams(req.body);

    const addedUsers = await addUsersToBlocklist(userIds);

    res.status(201).json(addedUsers);
  } catch (error) {
    ApiError.sendError(res, error);
  }
});

blocklistRouter.delete("/", async (req, res) => {
  try {
    const userIds = await parseBlocklistParams(req.body);

    await removeUsersFromBlocklist(userIds);

    res.status(204).send();
  } catch (error) {
    ApiError.sendError(res, error);
  }
});
