import { Router } from "express";
import { ApiError, BadRequestError } from "@/errors";
import { parseCanvasId } from "@/models/canvas.models";
import {
  FrameDataParamModel,
  FrameGuildIdsQueryModel,
  FrameOwnerParamModel,
  parseFrameId,
} from "@/models/frame.models";
import {
  createFrame,
  deleteFrame,
  editFrame,
  getFrameById,
  getFramesByGuildIds,
  getFramesByUserId,
} from "@/services/frameService";
import { normalizeBounds } from "@/utils";

export const frameRouter = Router();

frameRouter.get("/:frameId", async (req, res) => {
  try {
    const frame = await getFrameById(req.params.frameId);
    res.status(200).json(frame);
  } catch (error) {
    ApiError.sendError(res, error);
  }
});

frameRouter.get("/user/:userId/:canvasId", async (req, res) => {
  try {
    const frame = await getFramesByUserId(
      req.params.userId,
      await parseCanvasId(req.params),
    );
    res.status(200).json(frame);
  } catch (error) {
    ApiError.sendError(res, error);
  }
});

frameRouter.get("/guilds/:canvasId", async (req, res) => {
  try {
    const queryResult = await FrameGuildIdsQueryModel.safeParseAsync(req.query);
    if (!queryResult.success) {
      throw new BadRequestError(
        "Invalid query parameters. Expected guildIds as a string or string array",
        queryResult.error.issues,
      );
    }

    const frame = await getFramesByGuildIds(
      queryResult.data.guildIds,
      await parseCanvasId(req.params),
    );
    res.status(200).json(frame);
  } catch (error) {
    ApiError.sendError(res, error);
  }
});

frameRouter.put("/:frameId/edit", async (req, res) => {
  try {
    if (!req.user || !req.session.discordAccessToken) {
      throw new ApiError("Unauthorized", 401);
    }

    const [frameId, bodyQueryResult] = await Promise.all([
      parseFrameId(req.params),
      FrameDataParamModel.safeParseAsync(req.body),
    ]);
    if (!bodyQueryResult.success) {
      throw new BadRequestError(
        "Invalid body parameters",
        bodyQueryResult.error.issues,
      );
    }

    const { x0, y0, x1, y1 } = normalizeBounds(bodyQueryResult.data);

    const frame = await editFrame(
      req.user,
      req.session.discordAccessToken,
      frameId,
      bodyQueryResult.data.name,
      x0,
      y0,
      x1,
      y1,
    );
    res.status(200).json(frame);
  } catch (error) {
    ApiError.sendError(res, error);
  }
});

frameRouter.delete("/:frameId/delete", async (req, res) => {
  try {
    if (!req.user || !req.session.discordAccessToken) {
      throw new ApiError("Unauthorized", 401);
    }

    const frameId = await parseFrameId(req.params);

    await deleteFrame(req.user, req.session.discordAccessToken, frameId);
    res.status(204).json({ message: "Frame deleted" });
  } catch (error) {
    ApiError.sendError(res, error);
  }
});

frameRouter.post("/", async (req, res) => {
  try {
    if (!req.user || !req.session.discordAccessToken) {
      throw new ApiError("Unauthorized", 401);
    }

    const [canvasId, bodyQueryResult, ownerQueryResult] = await Promise.all([
      parseCanvasId(req.body),
      FrameDataParamModel.safeParseAsync(req.body),
      FrameOwnerParamModel.safeParseAsync(req.body),
    ]);
    if (!bodyQueryResult.success) {
      throw new BadRequestError(
        "Invalid body parameters",
        bodyQueryResult.error.issues,
      );
    }

    const { x0, y0, x1, y1 } = normalizeBounds(bodyQueryResult.data);

    if (!ownerQueryResult.success) {
      throw new BadRequestError(
        "Invalid body parameters",
        ownerQueryResult.error.issues,
      );
    }

    const frame = await createFrame(
      req.user,
      req.session.discordAccessToken,
      canvasId,
      bodyQueryResult.data.name,
      ownerQueryResult.data.ownerId,
      ownerQueryResult.data.isGuildOwned,
      x0,
      y0,
      x1,
      y1,
    );
    res.status(201).json(frame);
  } catch (error) {
    ApiError.sendError(res, error);
  }
});
