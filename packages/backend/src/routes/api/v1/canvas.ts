import { type Response, Router } from "express";
import { requireCanvasAdmin } from "@/middleware/canvasAuth";
import { typedRouter } from "@/middleware/typedRouter";
import { validate } from "@/middleware/validate";
import {
  CanvasIdParamModel,
  CreateCanvasBodyModel,
  EditCanvasBodyModel,
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
  validate({ params: CanvasIdParamModel }),
  async (req, res) => {
    const cachedCanvas = await getCanvasPng(req.params.canvasId);
    sendCachedCanvas(res, req.params.canvasId, cachedCanvas);
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
