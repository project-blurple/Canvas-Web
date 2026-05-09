import { Router } from "express";
import { ApiError } from "@/errors";
import { requireCanvasAdmin } from "@/middleware/canvasAuth";
import {
  ColorBodyModel,
  type ColorIdParam,
  parseColorId,
} from "@/models/color.models";
import { type EventIdParam, parseEventId } from "@/models/event.models";
import { type GuildIdParam, parseGuildId } from "@/models/guild.models";
import {
  assignColorToEvent,
  createColor,
  deleteColor,
  editColor,
  getCurrentEventPalette,
  getEventPalette,
  unassignColorFromEvent,
} from "@/services/paletteService";
import { assertZodSuccess } from "@/utils/models";

export const paletteRouter = Router();

paletteRouter.get("/current", async (_req, res) => {
  try {
    const palette = await getCurrentEventPalette();
    return res.status(200).json(palette);
  } catch (error) {
    ApiError.sendError(res, error);
  }
});

paletteRouter.get("/:eventId", async (req, res) => {
  try {
    const eventId = await parseEventId(req.params);
    const palette = await getEventPalette(eventId);

    res.status(200).json(palette);
  } catch (error) {
    ApiError.sendError(res, error);
  }
});

paletteRouter.post("/", requireCanvasAdmin, async (req, res) => {
  try {
    const colorData = await ColorBodyModel.safeParseAsync(req.body);
    assertZodSuccess(colorData);

    await createColor(colorData.data);

    res.status(201).json({ message: "Color created" });
  } catch (error) {
    return ApiError.sendError(res, error);
  }
});

paletteRouter.put<ColorIdParam>(
  "/:colorId",
  requireCanvasAdmin,
  async (req, res) => {
    try {
      const [colorId, colorData] = await Promise.all([
        parseColorId(req.params),
        ColorBodyModel.safeParseAsync(req.body),
      ]);
      assertZodSuccess(colorData);

      await editColor({
        colorId,
        data: colorData.data,
      });

      res.status(200).json({ message: "Color edited" });
    } catch (error) {
      return ApiError.sendError(res, error);
    }
  },
);

paletteRouter.delete<ColorIdParam>(
  "/:colorId",
  requireCanvasAdmin,
  async (req, res) => {
    try {
      const colorId = await parseColorId(req.params);

      await deleteColor(colorId);

      res.status(200).json({ message: "Color deleted" });
    } catch (error) {
      return ApiError.sendError(res, error);
    }
  },
);

paletteRouter.post<ColorIdParam & EventIdParam & GuildIdParam>(
  "/:colorId/assign/:eventId/:guildId",
  requireCanvasAdmin,
  async (req, res) => {
    try {
      const [colorId, eventId, guildId] = await Promise.all([
        parseColorId(req.params),
        parseEventId(req.params),
        parseGuildId(req.params),
      ]);

      await assignColorToEvent({
        colorId,
        eventId,
        guildId,
      });

      res.status(200).json({ message: "Color assigned to event" });
    } catch (error) {
      return ApiError.sendError(res, error);
    }
  },
);

paletteRouter.delete<ColorIdParam & EventIdParam & GuildIdParam>(
  "/:colorId/assign/:eventId/:guildId",
  requireCanvasAdmin,
  async (req, res) => {
    try {
      const [, eventId, guildId] = await Promise.all([
        parseColorId(req.params),
        parseEventId(req.params),
        parseGuildId(req.params),
      ]);

      // Color ID isn't actually used here, but I'm not sure how else to structure the route
      await unassignColorFromEvent({
        eventId,
        guildId,
      });

      res.status(200).json({ message: "Color unassigned from event" });
    } catch (error) {
      return ApiError.sendError(res, error);
    }
  },
);
