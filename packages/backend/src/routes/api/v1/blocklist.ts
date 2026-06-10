import {
  BlocklistBodyModel,
  BlocklistDeleteBodyModel,
} from "@blurple-canvas-web/types";
import { Router } from "express";
import { requireCanvasModerator } from "@/middleware/canvasAuth";
import { typedRouter } from "@/middleware/typedRouter";
import { validate } from "@/middleware/validate";
import { audit } from "@/services/auditLogService";
import {
  addUsersToBlocklist,
  getBlocklist,
  removeUsersFromBlocklist,
} from "@/services/blocklistService";
import { addSpanAttributes } from "@/utils/otel";

export const blocklistRouter = typedRouter(Router());

blocklistRouter.use(requireCanvasModerator);

blocklistRouter.get("/", async (req, res) => {
  const blocklist = await getBlocklist();
  res.status(200).json(blocklist);

  addSpanAttributes(req, { "response.size": blocklist.length });
});

blocklistRouter.put(
  "/",
  validate({ body: BlocklistBodyModel }),
  async (req, res) => {
    addSpanAttributes(req, { "blocklist.add.count": req.body.length });

    const addedUsers = await addUsersToBlocklist(req.body);
    res.status(201).json(addedUsers);

    void audit(req, "moderator", "blocklist.add", {
      metadata: {
        userIds: req.body.map((id) => id.toString()),
        addedCount: addedUsers.length,
      },
    });
  },
);

blocklistRouter.delete(
  "/",
  validate({ body: BlocklistDeleteBodyModel }),
  async (req, res) => {
    addSpanAttributes(req, {
      "blocklist.remove.count": req.body.userIds.length,
    });

    await removeUsersFromBlocklist(
      req.body.userIds,
      req.body.shouldRestoreHistoryForCanvasId ?? [],
    );
    res.status(204).send();
    void audit(req, "moderator", "blocklist.remove", {
      metadata: {
        userIds: req.body.userIds.map((id) => id.toString()),
        shouldRestoreHistoryForCanvasId:
          req.body.shouldRestoreHistoryForCanvasId,
      },
    });
  },
);
