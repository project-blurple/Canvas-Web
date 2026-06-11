import { stat } from "node:fs/promises";
import {
  CanvasExportParamModel,
  type CanvasExportScale,
  CanvasIdParamModel,
  CanvasPasteBodyModel,
  CanvasTimelapseParamModel,
  type Cooldown,
  CreateCanvasBodyModel,
  DEFAULT_CANVAS_EXPORT_SCALE,
  EditCanvasBodyModel,
  type FrameBoundsInput,
  OptionalFrameBoundsModel,
} from "@blurple-canvas-web/types";
import { type Response, Router } from "express";
import { assertLoggedIn, requireCanvasAdmin } from "@/middleware/canvasAuth";
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
import { generateTimelapse } from "@/services/timelapseService";
import { addSpanAttributes } from "@/utils/otel";
import { pixelRouter } from "./pixel";

export const canvasRouter = typedRouter(Router());

canvasRouter.use("/:canvasId/pixel", pixelRouter);

canvasRouter.get("/", async (req, res) => {
  const canvases = await getCanvases();
  res.status(200).json(canvases);

  addSpanAttributes(req, { "response.size": canvases.length });
});

canvasRouter.get("/current/info", async (req, res) => {
  const canvasInfo = await getCurrentCanvasInfo();
  res.status(200).json(canvasInfo);

  addSpanAttributes(req, { "canvas.id": canvasInfo?.id });
});

canvasRouter.get(
  "/:canvasId/info",
  validate({ params: CanvasIdParamModel }),
  async (req, res) => {
    addSpanAttributes(req, { "canvas.id": req.params.canvasId });

    const canvasInfo = await getCanvasInfo(req.params.canvasId);
    res.status(200).json(canvasInfo);
  },
);

canvasRouter.get("/current", async (req, res) => {
  const [canvasId, cachedCanvas] = await getCurrentCanvas();
  addSpanAttributes(req, { "canvas.id": canvasId });

  const fileSize = await sendCachedCanvas(res, canvasId, cachedCanvas);
  addSpanAttributes(req, { "response.export.size.bytes": fileSize });
});

canvasRouter.get(
  "/:canvasId@:scale.png",
  validate({ params: CanvasExportParamModel, query: OptionalFrameBoundsModel }),
  async (req, res) => {
    const scale = req.params.scale;
    addSpanAttributes(req, {
      "canvas.id": req.params.canvasId,
      "export.scale": scale,
      "bounds.x0": req.query?.x0,
      "bounds.y0": req.query?.y0,
      "bounds.x1": req.query?.x1,
      "bounds.y1": req.query?.y1,
    });

    const cachedCanvas = await getCanvasPng(req.params.canvasId);
    const fileSize = await sendCachedCanvas(
      res,
      req.params.canvasId,
      cachedCanvas,
      scale,
      req.query,
    );

    addSpanAttributes(req, { "response.export.size.bytes": fileSize });
  },
);

canvasRouter.get(
  "/:canvasId.mp4",
  validate({
    params: CanvasIdParamModel,
    query: CanvasTimelapseParamModel,
  }),
  async (req, res) => {
    const raw = req.query.raw || false;

    addSpanAttributes(req, {
      "canvas.id": req.params.canvasId,
      "timelapse.raw": raw,
    });

    const buffer = await generateTimelapse(
      raw ?
        {
          canvasId: req.params.canvasId,
          raw: true,
        }
      : { canvasId: req.params.canvasId },
    );
    res
      .status(200)
      .type(raw ? "webm" : "mp4")
      .setHeader(
        "Content-Disposition",
        `inline; filename="canvas-${req.params.canvasId}-timelapse${raw ? "-raw" : ""}.${raw ? "webm" : "mp4"}"`,
      )
      .send(buffer);

    // TODO: add response.size span attribute
  },
);

canvasRouter.get(
  "/:canvasId",
  validate({ params: CanvasIdParamModel }),
  async (req, res) => {
    addSpanAttributes(req, { "canvas.id": req.params.canvasId });

    const cachedCanvas = await getCanvasPng(req.params.canvasId);
    const fileSize = await sendCachedCanvas(
      res,
      req.params.canvasId,
      cachedCanvas,
    );

    addSpanAttributes(req, { "response.export.size.bytes": fileSize });
  },
);

canvasRouter.get(
  "/:canvasId/cooldown/@me",
  validate({ params: CanvasIdParamModel }),
  async (req, res) => {
    addSpanAttributes(req, { "canvas.id": req.params.canvasId });

    assertLoggedIn(req);
    const profile = req.user;

    addSpanAttributes(req, {
      "user.id": profile.id,
    });

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
    addSpanAttributes(req, {
      "canvas.name": req.body.name,
      "canvas.width": req.body.width,
      "canvas.height": req.body.height,
      "canvas.start_coordinates": req.body.startCoordinates?.map(String),
      "canvas.all_colors_global": req.body.allColorsGlobal,
      "canvas.cooldown.duration": req.body.cooldownDuration,
    });

    const canvas = await createCanvas(req.body);
    res.status(201).json(canvas);
    void audit(req, "admin", "canvas.create", {
      resourceId: canvas.id,
      metadata: req.body,
    });

    addSpanAttributes(req, { "canvas.id": canvas.id });
  },
);

canvasRouter.put(
  "/:canvasId",
  requireCanvasAdmin,
  validate({ params: CanvasIdParamModel, body: EditCanvasBodyModel }),
  async (req, res) => {
    addSpanAttributes(req, {
      "canvas.id": req.params.canvasId,
      "canvas.name": req.body.name,
      "canvas.all_colors_global": req.body.allColorsGlobal,
      "canvas.cooldown.duration": req.body.cooldownDuration,
    });

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

    addSpanAttributes(req, {
      "canvas.id": canvasId,
      "author.id": authorId,
      "paste.pixel_count": data.length,
    });

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
    addSpanAttributes(req, { "canvas.id": req.params.canvasId });

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
  bounds?: FrameBoundsInput,
): Promise<number | undefined> {
  if (cachedCanvas.isLocked) {
    const canvasPath = getLockedCanvasPath(cachedCanvas.canvasPaths, scale);

    if (!canvasPath) {
      throw new Error(
        `There is no cached canvas file for canvas ${canvasId} at ${scale}x`,
      );
    }

    const canvasStat = await stat(canvasPath);
    res.sendFile(canvasPath);
    return canvasStat.size;
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
    console.error(`Error streaming canvas %d PNG:`, canvasId, err);
    if (res.headersSent) {
      res.destroy(err);
    } else {
      res.sendStatus(500);
    }
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

  return await new Promise<number>((resolve, reject) => {
    let contentLength = 0;

    stream.on("data", (chunk: Buffer | string) => {
      contentLength +=
        typeof chunk === "string" ? Buffer.byteLength(chunk) : chunk.length;
    });

    stream.on("error", reject);

    stream.on("end", () => {
      resolve(contentLength);
    });
  });
}
