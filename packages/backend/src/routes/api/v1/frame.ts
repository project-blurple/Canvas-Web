import { DiscordUserProfile } from "@blurple-canvas-web/types";
import { Router } from "express";
import { ApiError, BadRequestError } from "@/errors";
import {
  FrameDataParamModel,
  FrameGuildIdsQueryModel,
  FrameOwnerParamModel,
  parseCanvasId,
  parseFrameId,
} from "@/models/paramModels";
import {
  createFrame,
  deleteFrame,
  editFrame,
  getFrameById,
  getFramesByGuildIds,
  getFramesByUserId,
} from "@/services/frameService";

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

frameRouter.post("/:frameId/edit", async (req, res) => {
  try {
    if (!req.user || !req.session.discordAccessToken) {
      throw new ApiError("Unauthorized", 401);
    }

    const frameId = await parseFrameId(req.params);

    const bodyQueryResult = await FrameDataParamModel.safeParseAsync(req.body);
    if (!bodyQueryResult.success) {
      throw new BadRequestError(
        "Invalid body parameters",
        bodyQueryResult.error.issues,
      );
    }

    await editFrame(
      req.user as DiscordUserProfile,
      req.session.discordAccessToken,
      frameId,
      bodyQueryResult.data.name,
      bodyQueryResult.data.x0,
      bodyQueryResult.data.y0,
      bodyQueryResult.data.x1,
      bodyQueryResult.data.y1,
    );
    res.status(200).json({ message: "Frame edited successfully" });
  } catch (error) {
    ApiError.sendError(res, error);
  }
});

frameRouter.post("/:frameId/delete", async (req, res) => {
  try {
    if (!req.user || !req.session.discordAccessToken) {
      throw new ApiError("Unauthorized", 401);
    }

    const frameId = await parseFrameId(req.params);

    await deleteFrame(
      req.user as DiscordUserProfile,
      req.session.discordAccessToken,
      frameId,
    );
    res.status(200).json({ message: "Frame deleted successfully" });
  } catch (error) {
    ApiError.sendError(res, error);
  }
});

frameRouter.post("/create", async (req, res) => {
  try {
    if (!req.user || !req.session.discordAccessToken) {
      throw new ApiError("Unauthorized", 401);
    }

    const canvasId = await parseCanvasId(req.body);

    const bodyQueryResult = await FrameDataParamModel.safeParseAsync(req.body);
    if (!bodyQueryResult.success) {
      throw new BadRequestError(
        "Invalid body parameters",
        bodyQueryResult.error.issues,
      );
    }

    const ownerQueryResult = await FrameOwnerParamModel.safeParseAsync(
      req.body,
    );
    if (!ownerQueryResult.success) {
      throw new BadRequestError(
        "Invalid body parameters",
        ownerQueryResult.error.issues,
      );
    }

    await createFrame(
      req.user as DiscordUserProfile,
      req.session.discordAccessToken,
      canvasId,
      bodyQueryResult.data.name,
      ownerQueryResult.data.ownerId,
      ownerQueryResult.data.isGuildOwned,
      bodyQueryResult.data.x0,
      bodyQueryResult.data.y0,
      bodyQueryResult.data.x1,
      bodyQueryResult.data.y1,
    );
    res.status(201).json({ message: "Frame created successfully" });
  } catch (error) {
    ApiError.sendError(res, error);
  }
});
