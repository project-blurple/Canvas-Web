import { Point } from "@blurple-canvas-web/types";
import { Router } from "express";
import { ApiError, BadRequestError } from "@/errors";
import {
  PixelHistoryComplexBodyModel,
  PixelHistoryComplexParamModel,
  PixelHistoryDeleteBodyModel,
  PixelHistoryParamModel,
} from "@/models/historyModels";
import { CanvasIdParam, parseCanvasId } from "@/models/paramModels";
import { assertCanvasModerator } from "@/services/discordGuildService";
import {
  deletePixelHistoryEntries,
  getPixelHistory,
} from "@/services/historyService";
import { assertLoggedIn } from "@/utils";

export const historyRouter = Router({ mergeParams: true });

historyRouter.get<CanvasIdParam>("/", async (req, res) => {
  try {
    // grabbing the canvasId from the path
    const canvasId = await parseCanvasId(req.params);

    // grabbing the x and y from the query
    const queryResult = await PixelHistoryParamModel.safeParseAsync(req.query);
    if (!queryResult.success) {
      throw new BadRequestError(
        "Invalid query parameters. Expected x, and y as positive integers",
        queryResult.error.issues,
      );
    }

    const coordinates = queryResult.data;
    const pixelHistory = await getPixelHistory({ canvasId, coordinates });

    res.status(200).json(pixelHistory);
  } catch (error) {
    ApiError.sendError(res, error);
  }
});

historyRouter.post<CanvasIdParam>("/", async (req, res) => {
  // Could become a QUERY endpoint in the future once it becomes supported
  // TODO: restrict by Canvas Manager auth?
  try {
    // grabbing the canvasId from the path
    const canvasId = await parseCanvasId(req.params);

    const [queryResult, bodyResult] = await Promise.all([
      PixelHistoryComplexParamModel.safeParseAsync(req.query),
      PixelHistoryComplexBodyModel.safeParseAsync(req.body),
    ]);

    if (!queryResult.success) {
      throw new BadRequestError(
        "Invalid query parameters. Expected x0, y0, x1, and y1 as positive integers, with x1 and y1 being optional",
        queryResult.error.issues,
      );
    }
    if (!bodyResult.success) {
      throw new BadRequestError(
        "Invalid request body. Expected a valid history query object",
        bodyResult.error.issues,
      );
    }

    const coordinate0 = {
      x: queryResult.data.x0,
      y: queryResult.data.y0,
    };
    const coordinate1 = {
      x: queryResult.data.x1 ?? queryResult.data.x0,
      y: queryResult.data.y1 ?? queryResult.data.y0,
    };
    const coordinates: [Point, Point] = [coordinate0, coordinate1];

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

    const pixelHistory = await getPixelHistory({
      canvasId,
      coordinates,
      dateRange,
      userIdFilter,
    });

    res.status(200).json(pixelHistory);
  } catch (error) {
    ApiError.sendError(res, error);
  }
});

historyRouter.delete<CanvasIdParam>("/", async (req, res) => {
  try {
    assertLoggedIn(req);
    assertCanvasModerator(req.user);

    const canvasId = await parseCanvasId(req.params);

    const bodyResult = await PixelHistoryDeleteBodyModel.safeParseAsync(
      req.body,
    );
    if (!bodyResult.success) {
      throw new BadRequestError(
        "Invalid request body. Expected an object with a historyIds property that is an array of non-negative integers",
        bodyResult.error.issues,
      );
    }

    const historyIds = bodyResult.data.historyIds.map(BigInt);

    await deletePixelHistoryEntries(
      canvasId,
      historyIds,
      bodyResult.data.blacklistAuthors,
    );

    res.status(204).send();
  } catch (error) {
    ApiError.sendError(res, error);
  }
});
