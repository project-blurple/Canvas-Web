import type { DiscordUserProfile, Point } from "@blurple-canvas-web/types";
import { Router } from "express";
import config from "@/config";
import {
  ApiError,
  BadRequestError,
  ForbiddenError,
  UnauthorizedError,
} from "@/errors";
import { socketHandler } from "@/index";
import { tenSecondLimiter } from "@/middleware/ratelimit";
import { type CanvasIdParam, parseCanvasId } from "@/models/canvas.models";
import {
  PixelHistoryParamModel,
  PlacePixelArrayBodyModel,
  PlacePixelBodyModel,
} from "@/models/pixel.models";
import { updateManyCachedPixels } from "@/services/canvasService";
import {
  getPixelHistory,
  placePixel,
  validateColor,
  validatePixel,
  validateUser,
} from "@/services/pixelService";

export const pixelRouter = Router({ mergeParams: true });

pixelRouter.get<CanvasIdParam>("/history", async (req, res) => {
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

/**
 * Endpoint that is only used by the bot to update the API cache. This does not insert the pixels
 * into the database as the bot already does this.
 *
 * @remarks This design decision best allows for the bot to continue functioning, even if the API
 * is down, or unable to handle the load.
 */
pixelRouter.post<CanvasIdParam>("/bot", async (req, res) => {
  try {
    if (!config.botPlacingEnabled) {
      throw new ForbiddenError("Bot placing is disabled");
    }

    const canvasId = await parseCanvasId(req.params);

    const apiKey = req.header("x-api-key");
    if (!apiKey || !config.botApiKey || apiKey !== config.botApiKey) {
      throw new UnauthorizedError("Invalid API key");
    }

    const result = await PlacePixelArrayBodyModel.safeParseAsync(req.body);
    if (!result.success) {
      throw new BadRequestError("Body is not valid", result.error.issues);
    }

    for (const pixel of result.data) {
      socketHandler.broadcastPixelPlacement(canvasId, pixel);
    }

    await updateManyCachedPixels(canvasId, result.data);
    res.status(204).end();
  } catch (error) {
    ApiError.sendError(res, error);
  }
});

/*
 * Endpoint for placing a pixel on the canvas
 * Requires the user to be authenticated and not blacklisted
 */
pixelRouter.post<CanvasIdParam>("/", tenSecondLimiter, async (req, res) => {
  if (!config.webPlacingEnabled) {
    throw new ForbiddenError("Web placing is disabled");
  }

  try {
    const result = await PlacePixelBodyModel.safeParseAsync(req.body);
    if (!result.success) {
      throw new BadRequestError("Body is not valid", result.error.issues);
    }

    const { x, y, colorId } = result.data;
    const canvasId = await parseCanvasId(req.params);
    const profile = req.user as DiscordUserProfile;

    if (!profile?.id) {
      throw new UnauthorizedError("User is not authenticated");
    }

    // TODO: see if Promise.all() can work here
    const coordinates: Point = { x, y };
    await validatePixel(canvasId, coordinates, true);
    await validateUser(BigInt(profile.id));
    const color = await validateColor(colorId);
    const { futureCooldown } = await placePixel(
      canvasId,
      BigInt(profile.id),
      coordinates,
      color,
    );
    if (!futureCooldown) return res.status(201).json({ cooldownEndTime: null });
    return res
      .status(201)
      .json({ cooldownEndTime: futureCooldown.valueOf() - Date.now() });
  } catch (error) {
    ApiError.sendError(res, error);
  }
});
