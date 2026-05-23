import type { CanvasExportSize } from "@blurple-canvas-web/types";
import { Router } from "express";
import config from "@/config";
import { assertLoggedIn, requireLoggedIn } from "@/middleware/canvasAuth";
import { frameMutationLimiter } from "@/middleware/ratelimit";
import { typedRouter } from "@/middleware/typedRouter";
import { validate } from "@/middleware/validate";
import { CanvasIdParamModel } from "@/models/canvas.models";
import {
  CreateFrameBodyModel,
  ExportFrameQueryModel,
  FrameDataParamModel,
  FrameGuildIdsQueryModel,
  FrameIdParamModel,
} from "@/models/frame.models";
import { UserCanvasParamModel } from "@/models/pixel.models";
import { withDiscordAccessToken } from "@/services/discordTokenService";
import {
  assertMaxOwnerFramesNotExceeded,
  createFrame,
  deleteFrame,
  editFrame,
  exportFrameAsStream,
  getFrameById,
  getFramesByGuildIds,
  getFramesByUserId,
} from "@/services/frameService";
import { normalizeBounds } from "@/utils";

export const frameRouter = typedRouter(Router());

// Needs to be above the `/:frameId` route to avoid being treated as a frame ID
frameRouter.get(
  "/:frameId.png",
  validate({ params: FrameIdParamModel, query: ExportFrameQueryModel }),
  async (req, res) => {
    const frame = await getFrameById(req.params.frameId);
    const size = req.query.size as CanvasExportSize;

    res.setHeader("Content-Type", "image/png");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="frame-${frame.id}.png"`,
    );

    try {
      const stream = await exportFrameAsStream({
        frameId: req.params.frameId,
        size,
      });
      stream.on("error", (err) => {
        console.error("Error streaming frame PNG:", err);
        if (!res.headersSent) res.sendStatus(500);
      });
      stream.pipe(res);
    } catch (err) {
      console.error("Failed to export frame stream:", err);
      res.sendStatus(500);
    }
  },
);

frameRouter.get(
  "/:frameId",
  validate({ params: FrameIdParamModel }),
  async (req, res) => {
    const frame = await getFrameById(req.params.frameId);
    res.status(200).json(frame);
  },
);

frameRouter.get(
  "/user/:userId/:canvasId",
  validate({ params: UserCanvasParamModel }),
  async (req, res) => {
    const frames = await getFramesByUserId(
      req.params.userId,
      req.params.canvasId,
    );
    res.status(200).json({
      data: frames,
      hasReachedMaxFrames: frames.length >= config.frames.maxAllowedUser,
    });
  },
);

frameRouter.get(
  "/guilds/:canvasId",
  validate({ params: CanvasIdParamModel, query: FrameGuildIdsQueryModel }),
  async (req, res) => {
    const { guildIds } = req.query;
    const frames = await getFramesByGuildIds(guildIds, req.params.canvasId);

    const hasReachedMaxFramesMap: Record<string, boolean> = {};
    for (const guildId of guildIds) {
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
  },
);

frameRouter.put(
  "/:frameId/edit",
  frameMutationLimiter,
  requireLoggedIn,
  validate({ params: FrameIdParamModel, body: FrameDataParamModel }),
  async (req, res) => {
    assertLoggedIn(req);

    const { x0, y0, x1, y1 } = normalizeBounds(req.body);
    const frame = await withDiscordAccessToken(
      req.session,
      async (accessToken) =>
        await editFrame(
          req.user,
          accessToken,
          req.params.frameId,
          req.body.name,
          x0,
          y0,
          x1,
          y1,
        ),
    );
    res.status(200).json(frame);
  },
);

frameRouter.delete(
  "/:frameId/delete",
  frameMutationLimiter,
  requireLoggedIn,
  validate({ params: FrameIdParamModel }),
  async (req, res) => {
    assertLoggedIn(req);

    await withDiscordAccessToken(req.session, async (accessToken) =>
      deleteFrame(req.user, accessToken, req.params.frameId),
    );
    res.status(204).end();
  },
);

frameRouter.post(
  "/",
  frameMutationLimiter,
  requireLoggedIn,
  validate({ body: CreateFrameBodyModel }),
  async (req, res) => {
    assertLoggedIn(req);

    const { canvasId, owner, name } = req.body;

    await assertMaxOwnerFramesNotExceeded({
      canvasId,
      owner,
    });

    const { x0, y0, x1, y1 } = normalizeBounds(req.body);

    const frame = await withDiscordAccessToken(
      req.session,
      async (accessToken) =>
        await createFrame(
          req.user,
          accessToken,
          canvasId,
          name,
          owner,
          x0,
          y0,
          x1,
          y1,
        ),
    );
    res.status(201).json(frame);
  },
);
