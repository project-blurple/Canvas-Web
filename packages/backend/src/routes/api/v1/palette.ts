import { Router } from "express";
import { ApiError } from "@/errors";
import BadRequestError from "@/errors/BadRequestError";
import { ColorBodyModel } from "@/models/bodyModels";
import { parseColorId, parseEventId, parseGuildId } from "@/models/paramModels";
import { assertCanvasAdmin } from "@/services/discordGuildService";
import {
  assignColorToEvent,
  createColor,
  deleteColor,
  editColor,
  getCurrentEventPalette,
  getEventPalette,
  unassignColorFromEvent,
} from "@/services/paletteService";
import { assertLoggedIn } from "@/utils";

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

paletteRouter.post("/", async (req, res) => {
  try {
    assertLoggedIn(req);
    assertCanvasAdmin(req.user);

    const colorData = await ColorBodyModel.safeParseAsync(req.body);
    if (!colorData.success) {
      throw new BadRequestError("Invalid color data", colorData.error.issues);
    }

    await createColor(colorData.data);

    res.status(201).json({ message: "Color created successfully" });
  } catch (error) {
    return ApiError.sendError(res, error);
  }
});

paletteRouter.put("/:colorId", async (req, res) => {
  try {
    assertLoggedIn(req);
    assertCanvasAdmin(req.user);

    const [colorId, colorData] = await Promise.all([
      parseColorId(req.params),
      ColorBodyModel.safeParseAsync(req.body),
    ]);

    if (!colorData.success) {
      throw new BadRequestError("Invalid color data", colorData.error.issues);
    }

    await editColor({
      colorId,
      data: colorData.data,
    });

    res.status(200).json({ message: "Color edited successfully" });
  } catch (error) {
    return ApiError.sendError(res, error);
  }
});

paletteRouter.delete("/:colorId", async (req, res) => {
  try {
    assertLoggedIn(req);
    assertCanvasAdmin(req.user);

    const colorId = await parseColorId(req.params);

    await deleteColor(colorId);

    res.status(200).json({ message: "Color deleted successfully" });
  } catch (error) {
    return ApiError.sendError(res, error);
  }
});

paletteRouter.post("/:colorId/assign/:eventId/:guildId", async (req, res) => {
  try {
    assertLoggedIn(req);
    assertCanvasAdmin(req.user);

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

    res.status(200).json({ message: "Color assigned to event successfully" });
  } catch (error) {
    return ApiError.sendError(res, error);
  }
});

paletteRouter.delete("/:colorId/assign/:eventId/:guildId", async (req, res) => {
  try {
    assertLoggedIn(req);
    assertCanvasAdmin(req.user);

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

    res
      .status(200)
      .json({ message: "Color unassigned from event successfully" });
  } catch (error) {
    return ApiError.sendError(res, error);
  }
});
