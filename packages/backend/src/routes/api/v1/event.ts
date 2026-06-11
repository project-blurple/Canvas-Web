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
import { addSpanAttributes } from "@/utils/otel";

export const eventRouter = typedRouter(Router());

eventRouter.get("/current", async (req, res) => {
  const event = await getCurrentEvent();
  res.status(200).json(event);

  addSpanAttributes(req, { "event.id": event?.id });
});

eventRouter.get(
  "/:eventId",
  validate({ params: EventIdParamModel }),
  async (req, res) => {
    addSpanAttributes(req, { "event.id": req.params.eventId });
    const event = await getEventById(req.params.eventId);
    res.status(200).json(event);
  },
);

eventRouter.post(
  "/",
  requireCanvasAdmin,
  validate({ body: CreateEventBodyModel }),
  async (req, res) => {
    addSpanAttributes(req, {
      "event.name": req.body.name,
      "event.id": req.body.id,
    });

    const event = await createEvent(req.body.name, req.body.id);
    res.status(201).json(event);
    addSpanAttributes(req, { "event.id": event.id });
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
    addSpanAttributes(req, {
      "event.id": req.params.eventId,
      "event.name": req.body.name,
    });

    const event = await editEvent(req.params.eventId, req.body.name);
    res.status(200).json(event);
    void audit(req, "admin", "event.update", {
      resourceId: event.id,
      metadata: req.body,
    });
  },
);
