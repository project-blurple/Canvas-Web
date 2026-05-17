import type { Point } from "@blurple-canvas-web/types";
import { Router } from "express";
import { ApiError } from "@/errors";
import {
  assertLoggedIn,
  requireCanvasModerator,
} from "@/middleware/canvasAuth";
import { type CanvasIdParam, parseCanvasId } from "@/models/canvas.models";
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
import { assertZodSuccess } from "@/utils/models";

export const historyRouter = Router({ mergeParams: true });

historyRouter.get<CanvasIdParam>("/", async (req, res) => {
  try {
    const canvasId = await parseCanvasId(req.params);

    const queryResult = await PixelHistoryParamModel.safeParseAsync(req.query);
    assertZodSuccess(
      queryResult,
      "Invalid query parameters. Expected x, and y as positive integers",
    );

    const coordinates = queryResult.data;
    const startedAt = performance.now();
    const pixelHistory = await getPixelHistorySummary(
      {
        canvasId,
        points: coordinates,
      },
      false,
    );

    res.status(200).json({
      ...pixelHistory,
      executionDurationMs: performance.now() - startedAt,
    });
  } catch (error) {
    ApiError.sendError(res, error);
  }
});

/**
 * @privateRemarks
 * Could become a QUERY endpoint in the future once it becomes supported
 */
historyRouter.post<CanvasIdParam>(
  "/",
  requireCanvasModerator,
  async (req, res) => {
    try {
      assertLoggedIn(req);

      const canvasId = await parseCanvasId(req.params);

      const [queryResult, bodyResult] = await Promise.all([
        PixelHistoryComplexParamModel.safeParseAsync(req.query),
        PixelHistoryComplexBodyModel.safeParseAsync(req.body),
      ]);
      assertZodSuccess(
        queryResult,
        "Invalid query parameters. Expected x0, y0, x1, and y1 as positive integers, with x1 and y1 being optional",
      );
      assertZodSuccess(
        bodyResult,
        "Invalid request body. Expected a valid history query object",
      );

      const point0 = {
        x: queryResult.data.x0,
        y: queryResult.data.y0,
      };
      const point1 = {
        x: queryResult.data.x1 ?? queryResult.data.x0,
        y: queryResult.data.y1 ?? queryResult.data.y0,
      };
      const points: [Point, Point] = [point0, point1];

      const dateRange = {
        from: bodyResult.data.fromDateTime,
        to: bodyResult.data.toDateTime,
      };

      const userIdFilter =
        bodyResult.data.includeUserIds ?
          { ids: bodyResult.data.includeUserIds.map(BigInt), include: true }
        : bodyResult.data.excludeUserIds ?
          { ids: bodyResult.data.excludeUserIds.map(BigInt), include: false }
        : undefined;

      const colorFilter =
        bodyResult.data.includeColors ?
          { colors: bodyResult.data.includeColors, include: true }
        : bodyResult.data.excludeColors ?
          { colors: bodyResult.data.excludeColors, include: false }
        : undefined;

      const startedAt = Date.now();
      const pixelHistory = await getPixelHistorySummary(
        {
          canvasId,
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
    } catch (error) {
      ApiError.sendError(res, error);
    }
  },
);

historyRouter.delete<CanvasIdParam>(
  "/",
  requireCanvasModerator,
  async (req, res) => {
    try {
      assertLoggedIn(req);

      const canvasId = await parseCanvasId(req.params);

      const bodyResult = await PixelHistoryDeleteBodyModel.safeParseAsync(
        req.body,
      );
      assertZodSuccess(bodyResult);

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
      } = bodyResult.data;

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
          canvasId,
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
    } catch (error) {
      ApiError.sendError(res, error);
    }
  },
);
