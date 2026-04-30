import type { Point } from "@blurple-canvas-web/types";
import { Router } from "express";
import { ApiError } from "@/errors";
import {
  PixelHistoryComplexBodyModel,
  PixelHistoryComplexParamModel,
  PixelHistoryDeleteBodyModel,
  PixelHistoryParamModel,
} from "@/models/history.models";
import { type CanvasIdParam, parseCanvasId } from "@/models/paramModels";
import { assertIsCanvasModerator } from "@/services/discordGuildService";
import {
  deletePixelHistoryEntries,
  getPixelHistory,
} from "@/services/historyService";
import { assertLoggedIn } from "@/utils";
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
    const pixelHistory = await getPixelHistory({
      canvasId,
      points: coordinates,
    });

    res.status(200).json(pixelHistory);
  } catch (error) {
    ApiError.sendError(res, error);
  }
});

historyRouter.post<CanvasIdParam>("/", async (req, res) => {
  // Could become a QUERY endpoint in the future once it becomes supported
  try {
    assertLoggedIn(req);
    assertIsCanvasModerator(req.user);

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

    const pixelHistory = await getPixelHistory({
      canvasId,
      points,
      dateRange,
      userIdFilter,
      colorFilter,
    });

    res.status(200).json(pixelHistory);
  } catch (error) {
    ApiError.sendError(res, error);
  }
});

historyRouter.delete<CanvasIdParam>("/", async (req, res) => {
  try {
    assertLoggedIn(req);
    assertIsCanvasModerator(req.user);

    const canvasId = await parseCanvasId(req.params);

    const bodyResult = await PixelHistoryDeleteBodyModel.safeParseAsync(
      req.body,
    );
    assertZodSuccess(
      bodyResult,
      "Invalid request body. Expected an object with a historyIds property that is an array of non-negative integers",
    );

    const historyIds = bodyResult.data.historyIds.map(BigInt);

    await deletePixelHistoryEntries(
      canvasId,
      historyIds,
      bodyResult.data.shouldBlockAuthors,
    );

    res.status(204).send();
  } catch (error) {
    ApiError.sendError(res, error);
  }
});
