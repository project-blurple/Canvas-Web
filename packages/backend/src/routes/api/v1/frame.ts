import { Router } from "express";
import config from "@/config";
import { ApiError, BadRequestError } from "@/errors";
import { frameMutationLimiter } from "@/middleware/ratelimit";
import { parseCanvasId } from "@/models/canvas.models";
import {
  FrameDataParamModel,
  FrameGuildIdsQueryModel,
  type FrameIdParam,
  FrameOwnerParamModel,
  parseFrameId,
} from "@/models/frame.models";
import {
  assertMaxOwnerFramesNotExceeded,
  createFrame,
  deleteFrame,
  editFrame,
  getFrameById,
  getFramesByGuildIds,
  getFramesByUserId,
} from "@/services/frameService";
import { normalizeBounds } from "@/utils";
import { assertZodSuccess } from "@/utils/models";

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
    const frames = await getFramesByUserId(
      req.params.userId,
      await parseCanvasId(req.params),
    );
    res.status(200).json({
      data: frames,
      hasReachedMaxFrames: frames.length >= config.frames.maxAllowedUser,
    });
  } catch (error) {
    ApiError.sendError(res, error);
  }
});

frameRouter.get("/guilds/:canvasId", async (req, res) => {
  try {
    const queryResult = await FrameGuildIdsQueryModel.safeParseAsync(req.query);
    assertZodSuccess(
      queryResult,
      "Invalid query parameters. Expected guildIds as a string or string array",
    );

    const frames = await getFramesByGuildIds(
      queryResult.data.guildIds,
      await parseCanvasId(req.params),
    );

    const hasReachedMaxFramesMap: Record<string, boolean> = {};
    for (const guildId of queryResult.data.guildIds) {
      const frameCount = frames.reduce((count, frame) => {
        if (frame.owner.guild.guild_id === guildId) count++;
        return count;
      }, 0);
      hasReachedMaxFramesMap[guildId] =
        frameCount >= config.frames.maxAllowedGuild;
    }

    res.status(200).json({
      data: frames,
      hasReachedMaxFrames: hasReachedMaxFramesMap,
    });
  } catch (error) {
    ApiError.sendError(res, error);
  }
});

frameRouter.put<FrameIdParam>(
  "/:frameId/edit",
  frameMutationLimiter,
  async (req, res) => {
    try {
      if (!req.user || !req.session.discordAccessToken) {
        throw new ApiError("Unauthorized", 401);
      }

      const [frameId, bodyQueryResult] = await Promise.all([
        parseFrameId(req.params),
        FrameDataParamModel.safeParseAsync(req.body),
      ]);
      assertZodSuccess(bodyQueryResult);

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
  },
);

frameRouter.delete<FrameIdParam>(
  "/:frameId/delete",
  frameMutationLimiter,
  async (req, res) => {
    try {
      if (!req.user || !req.session.discordAccessToken) {
        throw new ApiError("Unauthorized", 401);
      }

      const frameId = await parseFrameId(req.params);

      await deleteFrame(req.user, req.session.discordAccessToken, frameId);
      res.status(204).end();
    } catch (error) {
      ApiError.sendError(res, error);
    }
  },
);

frameRouter.post<FrameIdParam>("/", frameMutationLimiter, async (req, res) => {
  try {
    if (!req.user || !req.session.discordAccessToken) {
      throw new ApiError("Unauthorized", 401);
    }

    const [canvasId, bodyQueryResult, ownerQueryResult] = await Promise.all([
      parseCanvasId(req.body),
      FrameDataParamModel.safeParseAsync(req.body),
      FrameOwnerParamModel.safeParseAsync(req.body),
    ]);
    assertZodSuccess(bodyQueryResult);
    assertZodSuccess(ownerQueryResult);

    await assertMaxOwnerFramesNotExceeded({
      canvasId,
      ownerId: ownerQueryResult.data.ownerId,
      isGuildOwned: ownerQueryResult.data.isGuildOwned,
    });

    const { x0, y0, x1, y1 } = normalizeBounds(bodyQueryResult.data);

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
