import { Router } from "express";
import { requireCanvasModerator } from "@/middleware/canvasAuth";
import { typedRouter } from "@/middleware/typedRouter";
import { validate } from "@/middleware/validate";
import { BlocklistBodyModel } from "@/models/blocklist.models";
import {
  addUsersToBlocklist,
  getBlocklist,
  removeUsersFromBlocklist,
} from "@/services/blocklistService";

export const blocklistRouter = typedRouter(Router());

blocklistRouter.use(requireCanvasModerator);

blocklistRouter.get("/", async (_req, res) => {
  const blocklist = await getBlocklist();
  res.status(200).json(blocklist);
});

blocklistRouter.put(
  "/",
  validate({ body: BlocklistBodyModel }),
  async (req, res) => {
    const addedUsers = await addUsersToBlocklist(req.body);
    res.status(201).json(addedUsers);
  },
);

blocklistRouter.delete(
  "/",
  validate({ body: BlocklistBodyModel }),
  async (req, res) => {
    await removeUsersFromBlocklist(req.body);
    res.status(204).send();
  },
);
