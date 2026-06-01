import {
  CreateEventBodyModel,
  EditEventBodyModel,
  EventIdParamModel,
} from "@blurple-canvas-web/types";
import { Router } from "express";
import { requireCanvasAdmin } from "@/middleware/canvasAuth";
import { typedRouter } from "@/middleware/typedRouter";
import { validate } from "@/middleware/validate";
import { audit } from "@/services/auditLogService";
import {
  createEvent,
  editEvent,
  getCurrentEvent,
  getEventById,
} from "@/services/eventService";

export const eventRouter = typedRouter(Router());

eventRouter.get("/current", async (_req, res) => {
  const event = await getCurrentEvent();
  res.status(200).json(event);
});

eventRouter.get(
  "/:eventId",
  validate({ params: EventIdParamModel }),
  async (req, res) => {
    const event = await getEventById(req.params.eventId);
    res.status(200).json(event);
  },
);

eventRouter.post(
  "/",
  requireCanvasAdmin,
  validate({ body: CreateEventBodyModel }),
  async (req, res) => {
    const event = await createEvent(req.body.name, req.body.id);
    res.status(201).json(event);
    void audit(req, "admin", "event.create", {
      resourceId: event.id,
      metadata: req.body,
    });
  },
);

eventRouter.put(
  "/:eventId",
  requireCanvasAdmin,
  validate({ params: EventIdParamModel, body: EditEventBodyModel }),
  async (req, res) => {
    const event = await editEvent(req.params.eventId, req.body.name);
    res.status(200).json(event);
    void audit(req, "admin", "event.update", {
      resourceId: event.id,
      metadata: req.body,
    });
  },
);
