import { Router } from "express";
import { ApiError, BadRequestError } from "@/errors";
import {
  CanvasIdParam,
  PixelHistoryParamModel,
  parseCanvasId,
} from "@/models/paramModels";
import { getPixelHistory } from "@/services/pixelService";

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
    const pixelHistory = await getPixelHistory(canvasId, coordinates);

    res.status(200).json(pixelHistory);
  } catch (error) {
    ApiError.sendError(res, error);
  }
});

historyRouter.delete<CanvasIdParam>("/", async (_req, res) => {
  return res.status(504).json({ message: "Not implemented" });
});
