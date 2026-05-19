import type { Point } from "@blurple-canvas-web/types";
import { Router } from "express";
import cacheGets from "@/middleware/cache";
import {
  assertLoggedIn,
  requireCanvasModerator,
} from "@/middleware/canvasAuth";
import { typedRouter } from "@/middleware/typedRouter";
import { validate } from "@/middleware/validate";
import { CanvasIdParamModel } from "@/models/canvas.models";
import {
  PixelHistoryComplexBodyModel,
  PixelHistoryComplexParamModel,
  PixelHistoryDeleteBodyModel,
  PixelHistoryParamModel,
} from "@/models/history.models";
import {
  deletePixelHistoryEntries,
  getPixelHistorySummary,
} from "@/services/historyService";

export const historyRouter = typedRouter(Router({ mergeParams: true }));

historyRouter.get(
  "/",
  validate({ params: CanvasIdParamModel, query: PixelHistoryParamModel }),
  cacheGets(),
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

historyRouter.delete(
  "/",
  requireCanvasModerator,
  validate({ params: CanvasIdParamModel, body: PixelHistoryDeleteBodyModel }),
  async (req, res) => {
    assertLoggedIn(req);

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

    const point0 = { x: x0, y: y0 };
    const point1 = { x: x1 ?? x0, y: y1 ?? y0 };

    const userIdFilter =
      includeUserIds ? { ids: includeUserIds.map(BigInt), include: true }
      : excludeUserIds ? { ids: excludeUserIds.map(BigInt), include: false }
      : undefined;

    const colorFilter =
      includeColors ? { colors: includeColors, include: true }
      : excludeColors ? { colors: excludeColors, include: false }
      : undefined;

    await deletePixelHistoryEntries(
      {
        canvasId: req.params.canvasId,
        points: [point0, point1],
        dateRange: {
          from: fromDateTime,
          to: toDateTime,
        },
        userIdFilter,
        colorFilter,
      },
      shouldBlockAuthors,
    );

    res.status(204).send();
  },
);
