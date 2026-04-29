import { type Response, Router } from "express";
import { ApiError } from "@/errors";
import { parseCanvasId } from "@/models/paramModels";
import {
  type CachedCanvas,
  getCanvases,
  getCanvasFilename,
  getCanvasInfo,
  getCanvasPng,
  getCurrentCanvas,
  getCurrentCanvasInfo,
  unlockedCanvasToPng,
} from "@/services/canvasService";
import { pixelRouter } from "./pixel";

export const canvasRouter = Router();

canvasRouter.use("/:canvasId/pixel", pixelRouter);

canvasRouter.get("/", async (_req, res) => {
  try {
    const canvases = await getCanvases();
    res.status(200).json(canvases);
  } catch (error) {
    ApiError.sendError(res, error);
  }
});

canvasRouter.get("/current/info", async (_req, res) => {
  try {
    const canvasInfo = await getCurrentCanvasInfo();
    res.status(200).json(canvasInfo);
  } catch (error) {
    ApiError.sendError(res, error);
  }
});

canvasRouter.get("/:canvasId/info", async (req, res) => {
  try {
    const canvasId = await parseCanvasId(req.params);
    const canvasInfo = await getCanvasInfo(canvasId);

    res.status(200).json(canvasInfo);
  } catch (error) {
    ApiError.sendError(res, error);
  }
});

canvasRouter.get("/current", async (_req, res) => {
  try {
    const [canvasId, cachedCanvas] = await getCurrentCanvas();
    sendCachedCanvas(res, canvasId, cachedCanvas);
  } catch (error) {
    ApiError.sendError(res, error);
  }
});

canvasRouter.get("/:canvasId", async (req, res) => {
  try {
    const canvasId = await parseCanvasId(req.params);
    const cachedCanvas = await getCanvasPng(canvasId);

    sendCachedCanvas(res, canvasId, cachedCanvas);
  } catch (error) {
    ApiError.sendError(res, error);
  }
});

/**
 * Handles sending a cached canvas as a response.
 */
function sendCachedCanvas(
  res: Response,
  canvasId: number,
  cachedCanvas: CachedCanvas,
): void {
  if (cachedCanvas.isLocked) {
    res.sendFile(cachedCanvas.canvasPath);
    return;
  }

  const filename = getCanvasFilename(canvasId);

  unlockedCanvasToPng(cachedCanvas)
    .pack()
    .pipe(
      res
        .status(200)
        .type("png")
        .setHeader("Cache-Control", ["no-cache", "no-store"])
        // Needed to force Safari to not cache the image
        .setHeader("Vary", "*")
        .setHeader("Content-Disposition", `inline; filename="${filename}"`),
    );
}
