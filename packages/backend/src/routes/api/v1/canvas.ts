import { type Response, Router } from "express";
import { ApiError } from "@/errors";
import {
  type CanvasIdParam,
  CreateCanvasBodyModel,
  EditCanvasBodyModel,
  parseCanvasId,
} from "@/models/canvas.models";
import {
  type CachedCanvas,
  createCanvas,
  editCanvas,
  getCanvases,
  getCanvasFilename,
  getCanvasInfo,
  getCanvasPng,
  getCurrentCanvas,
  getCurrentCanvasInfo,
  unlockedCanvasToPng,
} from "@/services/canvasService";
import { assertCanvasAdmin } from "@/services/discordGuildService";
import { assertLoggedIn } from "@/utils";
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

canvasRouter.post("/", async (req, res) => {
  try {
    assertLoggedIn(req);
    assertCanvasAdmin(req.user);

    const canvasData = await CreateCanvasBodyModel.safeParseAsync(req.body);

    if (!canvasData.success) {
      res.status(400).json({ message: "Invalid canvas data" });
      return;
    }

    await createCanvas({
      name: canvasData.data.name,
      width: canvasData.data.width,
      height: canvasData.data.height,
      startCoordinates: canvasData.data.startCoordinates,
      cooldownLength: canvasData.data.cooldownLength,
    });

    res.status(201).json({ message: "Canvas created successfully" });
  } catch (error) {
    ApiError.sendError(res, error);
  }
});

canvasRouter.put<CanvasIdParam>("/:canvasId", async (req, res) => {
  try {
    assertLoggedIn(req);
    assertCanvasAdmin(req.user);

    const [canvasId, canvasData] = await Promise.all([
      parseCanvasId(req.params),
      EditCanvasBodyModel.safeParseAsync(req.body),
    ]);

    if (!canvasData.success) {
      res.status(400).json({ message: "Invalid canvas data" });
      return;
    }

    await editCanvas({
      canvasId,
      name: canvasData.data.name,
      cooldownLength: canvasData.data.cooldownLength,
      isLocked: canvasData.data.isLocked,
    });

    res.status(200).json({ message: "Canvas edited successfully" });
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
