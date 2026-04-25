import { Router } from "express";

import { ApiError } from "@/errors";
import { CreateEventBodyModel, EditEventBodyModel } from "@/models/bodyModels";
import { parseEventId } from "@/models/paramModels";
import { assertCanvasAdmin } from "@/services/discordGuildService";
import {
  createEvent,
  editEvent,
  getCurrentEvent,
  getEventById,
} from "@/services/eventService";
import { assertLoggedIn } from "@/utils";

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

eventRouter.post("/", async (req, res) => {
  try {
    assertLoggedIn(req);
    assertCanvasAdmin(req.user);

    const eventData = await CreateEventBodyModel.parseAsync(req.body);

    await createEvent(eventData.name, eventData.id);

    res.status(201).json({ message: "Event created successfully" });
  } catch (error) {
    ApiError.sendError(res, error);
  }
});

eventRouter.put("/:eventId", async (req, res) => {
  try {
    assertLoggedIn(req);
    assertCanvasAdmin(req.user);

    const [eventId, eventData] = await Promise.all([
      parseEventId(req.params),
      EditEventBodyModel.parseAsync(req.body),
    ]);

    await editEvent(eventId, eventData.name);

    res.status(200).json({ message: "Event edited successfully" });
  } catch (error) {
    ApiError.sendError(res, error);
  }
});
