import { Router } from "express";
import { ApiError } from "@/errors";
import BadRequestError from "@/errors/BadRequestError";
import { EventIdParamModel } from "@/models/paramModels";
import {
  getCurrentEventPalette,
  getEventPalette,
} from "@/services/paletteService";

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
    const result = await EventIdParamModel.safeParseAsync(req.params);
    if (!result.success) {
      throw new BadRequestError(
        `${req.params.eventId} is not a valid event ID`,
        result.error.issues,
      );
    }

    const { eventId } = result.data;
    const palette = await getEventPalette(eventId);

    res.status(200).json(palette);
  } catch (error) {
    ApiError.sendError(res, error);
  }
});
