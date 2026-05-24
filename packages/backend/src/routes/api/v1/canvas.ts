import {
  CanvasExportParamModel,
  CanvasExportQueryModel,
  type CanvasExportScale,
  CanvasIdParamModel,
  CanvasPasteBodyModel,
  type Cooldown,
  CreateCanvasBodyModel,
  DEFAULT_CANVAS_EXPORT_SCALE,
  type DiscordUserProfile,
  EditCanvasBodyModel,
} from "@blurple-canvas-web/types";
import { type Response, Router } from "express";
import type z from "zod";
import { UnauthorizedError } from "@/errors";
import { requireCanvasAdmin } from "@/middleware/canvasAuth";
import { typedRouter } from "@/middleware/typedRouter";
import { validate } from "@/middleware/validate";
import { audit } from "@/services/auditLogService";
import {
  type CachedCanvas,
  clearCachedCanvas,
  createCanvas,
  editCanvas,
  getCanvases,
  getCanvasFilename,
  getCanvasInfo,
  getCanvasPng,
  getCurrentCanvas,
  getCurrentCanvasInfo,
  getLockedCanvasPath,
  pasteCanvasData,
  unlockedCanvasToPngStream,
} from "@/services/canvasService";
import { exportCanvasBoundsAsStream } from "@/services/exportService";
import { getUserCanvasCooldown } from "@/services/pixelService";
import { pixelRouter } from "./pixel";

export const canvasRouter = typedRouter(Router());

canvasRouter.use("/:canvasId/pixel", pixelRouter);

canvasRouter.get("/", async (_req, res) => {
  const canvases = await getCanvases();
  res.status(200).json(canvases);
});

canvasRouter.get("/current/info", async (_req, res) => {
  const canvasInfo = await getCurrentCanvasInfo();
  res.status(200).json(canvasInfo);
});

canvasRouter.get(
  "/:canvasId/info",
  validate({ params: CanvasIdParamModel }),
  async (req, res) => {
    const canvasInfo = await getCanvasInfo(req.params.canvasId);
    res.status(200).json(canvasInfo);
  },
);

canvasRouter.get("/current", async (_req, res) => {
  const [canvasId, cachedCanvas] = await getCurrentCanvas();
  await sendCachedCanvas(res, canvasId, cachedCanvas);
});

canvasRouter.get(
  "/:canvasId@:scale.png",
  validate({ params: CanvasExportParamModel, query: CanvasExportQueryModel }),
  async (req, res) => {
    const scale = req.params.scale;

    const cachedCanvas = await getCanvasPng(req.params.canvasId);
    await sendCachedCanvas(
      res,
      req.params.canvasId,
      cachedCanvas,
      scale,
      req.query,
    );
  },
);

canvasRouter.get(
  "/:canvasId",
  validate({ params: CanvasIdParamModel }),
  async (req, res) => {
    const cachedCanvas = await getCanvasPng(req.params.canvasId);
    await sendCachedCanvas(res, req.params.canvasId, cachedCanvas);
  },
);

canvasRouter.get(
  "/:canvasId/cooldown/@me",
  validate({ params: CanvasIdParamModel }),
  async (req, res) => {
    const profile = req.user as DiscordUserProfile;

    if (!profile?.id) {
      throw new UnauthorizedError("User is not authenticated");
    }

    const cooldownEndTime = await getUserCanvasCooldown(
      req.params.canvasId,
      BigInt(profile.id),
    );

    res.status(200).json({
      cooldownEndTime: cooldownEndTime ?? undefined,
    } satisfies Cooldown);
  },
);

canvasRouter.post(
  "/",
  requireCanvasAdmin,
  validate({ body: CreateCanvasBodyModel }),
  async (req, res) => {
    const canvas = await createCanvas(req.body);
    res.status(201).json(canvas);
    void audit(req, "admin", "canvas.create", {
      resourceId: canvas.id,
      metadata: req.body,
    });
  },
);

canvasRouter.put(
  "/:canvasId",
  requireCanvasAdmin,
  validate({ params: CanvasIdParamModel, body: EditCanvasBodyModel }),
  async (req, res) => {
    const canvas = await editCanvas({
      canvasId: req.params.canvasId,
      ...req.body,
    });
    res.status(200).json(canvas);
    void audit(req, "admin", "canvas.update", {
      resourceId: canvas.id,
      metadata: req.body,
    });
  },
);

canvasRouter.post(
  "/:canvasId/paste",
  requireCanvasAdmin,
  validate({ params: CanvasIdParamModel, body: CanvasPasteBodyModel }),
  async (req, res) => {
    const { canvasId } = req.params;
    const { authorId, data } = req.body;

    await pasteCanvasData(canvasId, BigInt(authorId), data);

    res.status(200).json({
      message: "Canvas data pasted",
      count: data.length,
    });

    const lowestX = Math.min(...data.map(([x]) => x));
    const lowestY = Math.min(...data.map(([_, y]) => y));
    const highestX = Math.max(...data.map(([x]) => x));
    const highestY = Math.max(...data.map(([_, y]) => y));

    void audit(req, "admin", "canvas.paste", {
      resourceId: canvasId,
      metadata: {
        authorId: authorId.toString(),
        pixelCount: data.length,
        area: {
          topLeftX: lowestX,
          topLeftY: lowestY,
          bottomRightX: highestX,
          bottomRightY: highestY,
        },
      },
    });
  },
);

canvasRouter.delete(
  "/:canvasId/cache",
  requireCanvasAdmin,
  validate({ params: CanvasIdParamModel }),
  async (req, res) => {
    await clearCachedCanvas(req.params.canvasId);
    res.status(204).end();

    void audit(req, "admin", "canvas.clearCache", {
      resourceId: req.params.canvasId,
    });
  },
);

/**
 * Handles sending a cached canvas as a response.
 */
async function sendCachedCanvas(
  res: Response,
  canvasId: number,
  cachedCanvas: CachedCanvas,
  scale: CanvasExportScale = DEFAULT_CANVAS_EXPORT_SCALE,
  bounds?: z.infer<typeof CanvasExportQueryModel>,
): Promise<void> {
  if (cachedCanvas.isLocked) {
    const canvasPath = getLockedCanvasPath(cachedCanvas.canvasPaths, scale);

    if (!canvasPath) {
      throw new Error(
        `There is no cached canvas file for canvas ${canvasId} at ${scale}x`,
      );
    }

    res.sendFile(canvasPath);
    return;
  }

  const stream =
    bounds ?
      await exportCanvasBoundsAsStream({
        canvasId,
        ...bounds,
        scale,
      })
    : unlockedCanvasToPngStream(cachedCanvas, scale);

  stream.on("error", (err) => {
    console.error("Error streaming frame PNG:", err);
    if (!res.headersSent) res.sendStatus(500);
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
        `inline; filename="${getCanvasFilename(canvasId, false, scale, bounds)}"`,
      ),
  );
}
