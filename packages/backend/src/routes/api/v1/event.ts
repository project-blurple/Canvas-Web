import { Router } from "express";

import { ApiError, BadRequestError } from "@/errors";
import { EventIdParamModel } from "@/models/paramModels";
import { getCurrentEvent, getEventById } from "@/services/eventService";

export const eventRouter = Router();

eventRouter.get("/current", async (_req, res) => {
  try {
    const event = await getCurrentEvent();
    res.status(200).json(event);
  } catch (error) {
    ApiError.sendError(res, error);
  }
});

eventRouter.get("/:eventId", async (req, res) => {
  try {
    const pathParams = await EventIdParamModel.safeParseAsync(req.params);

    if (!pathParams.success) {
      throw new BadRequestError(
        "Malformed path parameters",
        pathParams.error.issues,
      );
    }

    const { eventId } = pathParams.data;
    const event = await getEventById(eventId);

    res.status(200).json(event);
  } catch (error) {
    ApiError.sendError(res, error);
  }
});
