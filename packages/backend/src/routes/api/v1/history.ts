import {
  CanvasIdParamModel,
  PixelHistoryComplexBodyModel,
  PixelHistoryComplexParamModel,
  PixelHistoryDeleteBodyModel,
  PixelHistoryParamModel,
  type Point,
} from "@blurple-canvas-web/types";
import { Router } from "express";
import type { z } from "zod";
import {
  assertLoggedIn,
  requireCanvasAdmin,
  requireCanvasModerator,
} from "@/middleware/canvasAuth";
import { typedRouter } from "@/middleware/typedRouter";
import { validate } from "@/middleware/validate";
import { isCanvasInCurrentEvent } from "@/services/canvasService";
import {
  deletePixelHistoryEntries,
  getPixelHistorySummary,
} from "@/services/historyService";

export const historyRouter = typedRouter(Router({ mergeParams: true }));

historyRouter.get(
  "/",
  validate({ params: CanvasIdParamModel, query: PixelHistoryParamModel }),
  async (req, res) => {
    const startedAt = performance.now();
    const pixelHistory = await getPixelHistorySummary(
      {
        canvasId: req.params.canvasId,
        points: req.query,
      },
      false,
    );

    res.status(200).json({
      ...pixelHistory,
      executionDurationMs: performance.now() - startedAt,
    });
  },
);

/**
 * @privateRemarks
 * Could become a QUERY endpoint in the future once it becomes supported
 */

historyRouter.post(
  "/",
  requireCanvasModerator,
  validate({
    params: CanvasIdParamModel,
    query: PixelHistoryComplexParamModel,
    body: PixelHistoryComplexBodyModel,
  }),
  async (req, res) => {
    assertLoggedIn(req);

    const point0 = {
      x: req.query.x0,
      y: req.query.y0,
    };
    const point1 = {
      x: req.query.x1 ?? req.query.x0,
      y: req.query.y1 ?? req.query.y0,
    };
    const points: [Point, Point] = [point0, point1];

    const dateRange = {
      from: req.body.fromDateTime,
      to: req.body.toDateTime,
    };

    const userIdFilter =
      req.body.includeUserIds ?
        { ids: req.body.includeUserIds.map(BigInt), include: true }
      : req.body.excludeUserIds ?
        { ids: req.body.excludeUserIds.map(BigInt), include: false }
      : undefined;

    const colorFilter =
      req.body.includeColors ? { colors: req.body.includeColors, include: true }
      : req.body.excludeColors ?
        { colors: req.body.excludeColors, include: false }
      : undefined;

    const startedAt = Date.now();
    const pixelHistory = await getPixelHistorySummary(
      {
        canvasId: req.params.canvasId,
        points,
        dateRange,
        userIdFilter,
        colorFilter,
      },
      true,
    );

    res.status(200).json({
      ...pixelHistory,
      executionDurationMs: Date.now() - startedAt,
    });
  },
);

function buildDeletePayload(req: {
  body: z.infer<typeof PixelHistoryDeleteBodyModel>;
  params: z.infer<typeof CanvasIdParamModel>;
}) {
  const {
    x0,
    y0,
    x1,
    y1,
    fromDateTime,
    toDateTime,
    includeUserIds,
    excludeUserIds,
    includeColors,
    excludeColors,
    shouldBlockAuthors,
  } = req.body;

  const point0 = { x: x0, y: y0 } as Point;
  const point1 = { x: x1 ?? x0, y: y1 ?? y0 } as Point;

  const userIdFilter =
    includeUserIds ? { ids: includeUserIds.map(BigInt), include: true }
    : excludeUserIds ? { ids: excludeUserIds.map(BigInt), include: false }
    : undefined;

  const colorFilter =
    includeColors ? { colors: includeColors, include: true }
    : excludeColors ? { colors: excludeColors, include: false }
    : undefined;

  const payload = {
    canvasId: req.params.canvasId,
    points: [point0, point1] as [Point, Point],
    dateRange: {
      from: fromDateTime,
      to: toDateTime,
    },
    userIdFilter,
    colorFilter,
  };

  return { payload, shouldBlockAuthors };
}

historyRouter.delete(
  "/",
  requireCanvasModerator,
  validate({ params: CanvasIdParamModel, body: PixelHistoryDeleteBodyModel }),
  async (req, res) => {
    assertLoggedIn(req);

    const { payload, shouldBlockAuthors } = buildDeletePayload(req);

    if (!(await isCanvasInCurrentEvent(req.params.canvasId))) {
      res.status(403).json({
        error:
          "Cannot erase history for a canvas that is not in the current event",
      });
      return;
    }

    await deletePixelHistoryEntries(payload, shouldBlockAuthors);

    res.status(204).send();
  },
);

// Admin-only endpoint to force-delete pixel history regardless of current event
historyRouter.delete(
  "/force",
  requireCanvasAdmin,
  validate({ params: CanvasIdParamModel, body: PixelHistoryDeleteBodyModel }),
  async (req, res) => {
    assertLoggedIn(req);

    const { payload, shouldBlockAuthors } = buildDeletePayload(req);

    await deletePixelHistoryEntries(payload, shouldBlockAuthors);

    res.status(204).send();
  },
);
