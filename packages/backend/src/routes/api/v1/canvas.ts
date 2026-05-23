import {
  type CanvasExportSize,
  CanvasIdParamModel,
  CanvasPasteBodyModel,
  type Cooldown,
  CreateCanvasBodyModel,
  type DiscordUserProfile,
  EditCanvasBodyModel,
  ExportFrameQueryModel,
} from "@blurple-canvas-web/types";
import { type Response, Router } from "express";
import { UnauthorizedError } from "@/errors";
import { requireCanvasAdmin } from "@/middleware/canvasAuth";
import { typedRouter } from "@/middleware/typedRouter";
import { validate } from "@/middleware/validate";
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
  sendCachedCanvas(res, canvasId, cachedCanvas);
});

canvasRouter.get(
  "/:canvasId",
  validate({ params: CanvasIdParamModel, query: ExportFrameQueryModel }),
  async (req, res) => {
    const size = req.query.size as CanvasExportSize;

    const cachedCanvas = await getCanvasPng(req.params.canvasId, size);
    sendCachedCanvas(res, req.params.canvasId, cachedCanvas, size);
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
  },
);

canvasRouter.delete(
  "/:canvasId/cache",
  requireCanvasAdmin,
  validate({ params: CanvasIdParamModel }),
  async (req, res) => {
    await clearCachedCanvas(req.params.canvasId);
    res.status(204).end();
  },
);

/**
 * Handles sending a cached canvas as a response.
 */
function sendCachedCanvas(
  res: Response,
  canvasId: number,
  cachedCanvas: CachedCanvas,
  size: CanvasExportSize = 1,
): void {
  if (cachedCanvas.isLocked) {
    const canvasPath = getLockedCanvasPath(cachedCanvas.canvasPaths, size);

    if (!canvasPath) {
      throw new Error(
        `There is no cached canvas file for canvas ${canvasId} at ${size}x`,
      );
    }

    res.sendFile(canvasPath);
    return;
  }

  const filename = getCanvasFilename(canvasId, false, size);

  unlockedCanvasToPngStream(cachedCanvas, size).pipe(
    res
      .status(200)
      .type("png")
      .setHeader("Cache-Control", ["no-cache", "no-store"])
      // Needed to force Safari to not cache the image
      .setHeader("Vary", "*")
      .setHeader("Content-Disposition", `inline; filename="${filename}"`),
  );
}
