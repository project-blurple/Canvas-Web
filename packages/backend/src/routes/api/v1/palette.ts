import { Router } from "express";
import { ApiError } from "@/errors";
import BadRequestError from "@/errors/BadRequestError";
import { EventIdParamModel, PaletteQueryModel } from "@/models/paramModels";
import {
  getCurrentEventPalette,
  getEventPalette,
} from "@/services/paletteService";

export const paletteRouter = Router();

paletteRouter.get("/current", async (req, res) => {
  try {
    const queryResult = await PaletteQueryModel.safeParseAsync(req.query);
    if (!queryResult.success) {
      throw new BadRequestError(
        `${req.query.allColors} is not a valid allColors value`,
        queryResult.error.issues,
      );
    }

    const { allColors } = queryResult.data;
    const palette = await getCurrentEventPalette(allColors);

    return res.status(200).json(palette);
  } catch (error) {
    ApiError.sendError(res, error);
  }
});

paletteRouter.get("/:eventId", async (req, res) => {
  try {
    const paramResult = await EventIdParamModel.safeParseAsync(req.params);
    if (!paramResult.success) {
      throw new BadRequestError(
        `${req.params.eventId} is not a valid event ID`,
        paramResult.error.issues,
      );
    }

    const queryResult = await PaletteQueryModel.safeParseAsync(req.query);
    if (!queryResult.success) {
      throw new BadRequestError(
        `${req.query.allColors} is not a valid allColors value`,
        queryResult.error.issues,
      );
    }

    const { eventId } = paramResult.data;
    const { allColors } = queryResult.data;
    const palette = await getEventPalette(eventId, allColors);

    res.status(200).json(palette);
  } catch (error) {
    ApiError.sendError(res, error);
  }
});
