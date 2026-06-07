import {
  CanvasIdParamModel,
  PlacePixelArrayBodyModel,
  PlacePixelBodyModel,
  type Point,
} from "@blurple-canvas-web/types";
import { Router } from "express";
import config from "@/config";
import { ForbiddenError, UnauthorizedError } from "@/errors";
import { socketHandler } from "@/index";
import { assertLoggedIn } from "@/middleware/canvasAuth";
import { pixelPlacementLimiter } from "@/middleware/ratelimit";
import { typedRouter } from "@/middleware/typedRouter";
import { validate } from "@/middleware/validate";
import { updateManyCachedPixels } from "@/services/canvasService";
import { getCachedUserGuildFlags } from "@/services/discordGuildService";
import { withDiscordAccessToken } from "@/services/discordTokenService";
import {
  placePixel,
  validateColor,
  validatePixel,
  validateUser,
} from "@/services/pixelService";
import { verifyTurnstileToken } from "@/services/turnstileService";
import { historyRouter } from "./history";
import { addSpanAttributes } from "@/utils/otel";

export const pixelRouter = typedRouter(Router({ mergeParams: true }));

pixelRouter.use("/history", historyRouter);

/**
 * Endpoint that is only used by the bot to update the API cache. This does not insert the pixels
 * into the database as the bot already does this.
 *
 * @remarks This design decision best allows for the bot to continue functioning, even if the API
 * is down, or unable to handle the load.
 */
pixelRouter.post(
  "/bot",
  validate({ params: CanvasIdParamModel, body: PlacePixelArrayBodyModel }),
  async (req, res) => {
    if (!config.botPlacingEnabled) {
      throw new ForbiddenError("Bot placing is disabled");
    }

    const apiKey = req.header("x-api-key");
    if (!apiKey || !config.botApiKey || apiKey !== config.botApiKey) {
      throw new UnauthorizedError("Invalid API key");
    }

    for (const pixel of req.body) {
      socketHandler.broadcastPixelPlacement(req.params.canvasId, pixel);
    }

    await updateManyCachedPixels(req.params.canvasId, req.body);
    res.status(204).end();
  },
);

/*
 * Endpoint for placing a pixel on the canvas
 * Requires the user to be authenticated and not blocklisted
 */
pixelRouter.post(
  "/",
  pixelPlacementLimiter,
  validate({ params: CanvasIdParamModel, body: PlacePixelBodyModel }),
  async (req, res) => {
    if (!config.webPlacingEnabled) {
      throw new ForbiddenError("Web placing is disabled");
    }

    const { x, y, colorId } = req.body;
    assertLoggedIn(req);
    const profile = req.user;

    addSpanAttributes(req, {
      "canvas.id": req.params.canvasId,
      "params.color.id": colorId,
      "params.coordinate.x": x,
      "params.coordinate.y": y,
      "turnstile.provided": Boolean(req.body.turnstileToken),
      "pixel.place.success": false,
    });

    await verifyTurnstileToken(req.body.turnstileToken ?? "");

    const coordinates: Point = { x, y };
    const guildFlags = await withDiscordAccessToken(
      req.session,
      (accessToken) => getCachedUserGuildFlags(req.session, accessToken),
    );
    const userGuildIds = new Set(Object.keys(guildFlags));

    const [color] = await Promise.all([
      validateColor(colorId, req.params.canvasId, userGuildIds),
      validatePixel(req.params.canvasId, coordinates, true),
      validateUser(BigInt(profile.id)),
    ]);

    addSpanAttributes(req, {
      "params.color.name": color.name,
    });

    const { futureCooldown } = await placePixel(
      req.params.canvasId,
      BigInt(profile.id),
      coordinates,
      color,
    );
    if (!futureCooldown) {
      res.status(201).json({ cooldownEndTime: null });
      addSpanAttributes(req, {
        "pixel.place.cooldown": false,
        "pixel.place.success": true,
      });
      return;
    }

    const cooldownMs = futureCooldown.valueOf() - Date.now();
    res.status(201).json({ cooldownEndTime: cooldownMs });
    addSpanAttributes(req, {
      "pixel.place.cooldown": cooldownMs,
      "pixel.place.success": true,
    });
  },
);
