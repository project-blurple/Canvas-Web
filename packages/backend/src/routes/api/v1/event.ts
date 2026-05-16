import { Router } from "express";

import { ApiError } from "@/errors";
import { requireCanvasAdmin } from "@/middleware/canvasAuth";
import {
  CreateEventBodyModel,
  EditEventBodyModel,
  type EventIdParam,
  parseEventId,
} from "@/models/event.models";
import {
  createEvent,
  editEvent,
  getCurrentEvent,
  getEventById,
} from "@/services/eventService";
import { assertZodSuccess } from "@/utils/models";

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
    const eventId = await parseEventId(req.params);
    const event = await getEventById(eventId);

    res.status(200).json(event);
  } catch (error) {
    ApiError.sendError(res, error);
  }
});

eventRouter.post("/", requireCanvasAdmin, async (req, res) => {
  try {
    const eventData = await CreateEventBodyModel.safeParseAsync(req.body);
    assertZodSuccess(eventData);

    const event = await createEvent(eventData.data.name, eventData.data.id);

    res.status(201).json(event);
  } catch (error) {
    ApiError.sendError(res, error);
  }
});

eventRouter.put<EventIdParam>(
  "/:eventId",
  requireCanvasAdmin,
  async (req, res) => {
    try {
      const [eventId, eventData] = await Promise.all([
        parseEventId(req.params),
        EditEventBodyModel.safeParseAsync(req.body),
      ]);
      assertZodSuccess(eventData);

      const event = await editEvent(eventId, eventData.data.name);

      res.status(200).json(event);
    } catch (error) {
      ApiError.sendError(res, error);
    }
  },
);
