import { Router } from "express";
import { ApiError } from "@/errors";
import {
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
      Number.parseInt(req.params.canvasId),
    );
    res.status(200).json(frame);
  } catch (error) {
    ApiError.sendError(res, error);
  }
});

frameRouter.get("/guilds/:canvasId", async (req, res) => {
  try {
    const guildIds: string[] = (req.query.guildIds as string[]) ?? [];
    const frame = await getFramesByGuildIds(
      guildIds,
      Number.parseInt(req.params.canvasId),
    );
    res.status(200).json(frame);
  } catch (error) {
    ApiError.sendError(res, error);
  }
});
