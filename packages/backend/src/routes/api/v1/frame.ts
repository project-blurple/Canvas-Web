import { stat } from "node:fs/promises";
import {
  CanvasIdParamModel,
  CanvasPlaceState,
  CreateFrameBodyModel,
  ExportFrameParamModel,
  FrameDataParamModel,
  FrameGuildIdsQueryModel,
  FrameIdParamModel,
  UserCanvasParamModel,
} from "@blurple-canvas-web/types";
import { Router } from "express";
import config from "@/config";
import {
  assertLoggedIn,
  requireCanvasModerator,
  requireLoggedIn,
} from "@/middleware/canvasAuth";
import { frameMutationLimiter } from "@/middleware/ratelimit";
import { typedRouter } from "@/middleware/typedRouter";
import { validate } from "@/middleware/validate";
import { getCanvasInfo } from "@/services/canvasService";
import { withDiscordAccessToken } from "@/services/discordTokenService";
import {
  createFrameExportPackage,
  exportFrameAsStream,
} from "@/services/exportService";
import {
  assertMaxOwnerFramesNotExceeded,
  createFrame,
  deleteFrame,
  editFrame,
  getFrameById,
  getFramePlacementTimestamps,
  getFramesByGuildIds,
  getFramesByUserId,
} from "@/services/frameService";
import { generateTimelapse } from "@/services/timelapse/timelapseService";
import { normalizeBounds } from "@/utils";
import { addSpanAttributes } from "@/utils/otel";

export const frameRouter = typedRouter(Router());

frameRouter.get(
  "/:frameId@:scale.png",
  validate({ params: ExportFrameParamModel }),
  async (req, res) => {
    addSpanAttributes(req, {
      "frame.id": req.params.frameId,
      "export.scale": req.params.scale,
    });

    const scale = req.params.scale;

    const stream = await exportFrameAsStream({
      frameId: req.params.frameId,
      scale,
    });

    stream.on("error", (err) => {
      console.error("Error streaming frame PNG:", err);
      if (res.headersSent) {
        res.destroy(err);
      } else {
        res.sendStatus(500);
      }
    });

    let contentLength = 0;

    stream.on("data", (chunk: Buffer | string) => {
      contentLength +=
        typeof chunk === "string" ? Buffer.byteLength(chunk) : chunk.length;
    });

    stream.pipe(
      res
        .status(200)
        .type("png")
        .setHeader("Cache-Control", ["no-cache", "no-store"])
        // Needed to force Safari to not cache the image
        .setHeader("Vary", "*")
        .setHeader(
          "Content-Disposition",
          `inline; filename="frame-${req.params.frameId}.png"`,
        ),
    );

    stream.on("end", () => {
      addSpanAttributes(req, {
        "response.export.size.bytes": contentLength,
      });
    });
  },
);

frameRouter.get(
  "/:frameId.mp4",
  requireCanvasModerator, // Temporary restriction until better timelapse restrictions are implemented https://github.com/project-blurple/Canvas-Web/issues/774
  validate({ params: FrameIdParamModel }),
  async (req, res) => {
    addSpanAttributes(req, { "frame.id": req.params.frameId });

    const frame = await getFrameById(req.params.frameId);
    const canvas = await getCanvasInfo(frame.canvasId);

    addSpanAttributes(req, { "canvas.id": frame.canvasId });

    if (canvas.placeState !== CanvasPlaceState.NoOne) {
      res.status(400).json({
        error: "Timelapse generation is only available for locked canvases",
      });
      return;
    }

    const { start, end } = await getFramePlacementTimestamps(frame.id);

    addSpanAttributes(req, {
      "timelapse.start": start?.toISOString(),
      "timelapse.end": end?.toISOString(),
    });

    const filePath = await generateTimelapse({
      canvasId: frame.canvasId,
      start,
      end,
      bounds: { ...frame },
    });

    const fileStats = await stat(filePath);

    addSpanAttributes(req, {
      "response.size": fileStats.size,
    });

    res
      .status(200)
      .type("mp4")
      .setHeader(
        "Content-Disposition",
        `inline; filename="canvas-${frame.canvasId}-frame-${frame.id}-timelapse.mp4"`,
      )
      .sendFile(filePath, (err) => {
        if (err) {
          console.error(
            `Failed to send timelapse file ${filePath}:`,
            err.message,
          );
        }
      });
  },
);

frameRouter.get(
  "/:frameId",
  validate({ params: FrameIdParamModel }),
  async (req, res) => {
    addSpanAttributes(req, { "frame.id": req.params.frameId });

    const frame = await getFrameById(req.params.frameId);
    res.status(200).json(frame);

    addSpanAttributes(req, { "canvas.id": frame.canvasId });
  },
);

frameRouter.get(
  "/user/:userId/:canvasId",
  validate({ params: UserCanvasParamModel }),
  async (req, res) => {
    addSpanAttributes(req, {
      "user.id": req.params.userId,
      "canvas.id": req.params.canvasId,
    });

    const frames = await getFramesByUserId(
      req.params.userId,
      req.params.canvasId,
    );
    res.status(200).json({
      data: frames,
      hasReachedMaxFrames: frames.length >= config.frames.maxAllowedUser,
    });

    addSpanAttributes(req, { "response.size": frames.length });
  },
);

frameRouter.get(
  "/guilds/:canvasId",
  validate({ params: CanvasIdParamModel, query: FrameGuildIdsQueryModel }),
  async (req, res) => {
    addSpanAttributes(req, {
      "canvas.id": req.params.canvasId,
      "guild.id": req.query.guildIds.map(String),
    });

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

    addSpanAttributes(req, { "response.size": frames.length });
  },
);

frameRouter.put(
  "/:frameId/edit",
  frameMutationLimiter,
  requireLoggedIn,
  validate({ params: FrameIdParamModel, body: FrameDataParamModel }),
  async (req, res) => {
    addSpanAttributes(req, {
      "frame.id": req.params.frameId,
      "frame.name": req.body.name,
      "frame.x0": req.body.x0,
      "frame.y0": req.body.y0,
      "frame.x1": req.body.x1,
      "frame.y1": req.body.y1,
    });

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
    addSpanAttributes(req, { "frame.id": req.params.frameId });

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
    addSpanAttributes(req, {
      "canvas.id": req.body.canvasId,
      "frame.name": req.body.name,
      "frame.owner.type": req.body.owner.type,
      "frame.owner.id": req.body.owner.id,
      "frame.bounds.x0": req.body.x0,
      "frame.bounds.y0": req.body.y0,
      "frame.bounds.x1": req.body.x1,
      "frame.bounds.y1": req.body.y1,
    });

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

    addSpanAttributes(req, { "frame.id": frame.id });
  },
);

frameRouter.get(
  "/:frameId/export",
  validate({ params: FrameIdParamModel }),
  async (req, res) => {
    addSpanAttributes(req, { "frame.id": req.params.frameId });

    const exportPackage = await createFrameExportPackage(req.params.frameId);

    res.status(200).json(exportPackage);
  },
);
