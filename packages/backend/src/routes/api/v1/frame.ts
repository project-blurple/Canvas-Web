import { DiscordUserProfile } from "@blurple-canvas-web/types";
import { Router } from "express";
import { ApiError, BadRequestError } from "@/errors";
import { FrameGuildIdsQueryModel, parseCanvasId } from "@/models/paramModels";
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

    editFrame(
      req.user as DiscordUserProfile,
      req.session.discordAccessToken,
      req.params.frameId,
      req.body.name,
      req.body.x0,
      req.body.y0,
      req.body.x1,
      req.body.y1,
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

    await deleteFrame(
      req.user as DiscordUserProfile,
      req.session.discordAccessToken,
      req.params.frameId,
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

    await createFrame(
      req.user as DiscordUserProfile,
      req.session.discordAccessToken,
      req.body.canvasId,
      req.body.name,
      req.body.ownerId,
      req.body.isGuildOwned,
      req.body.x0,
      req.body.y0,
      req.body.x1,
      req.body.y1,
    );
    res.status(201).json({ message: "Frame created successfully" });
  } catch (error) {
    ApiError.sendError(res, error);
  }
});
