import {
  AssignColorParamModel,
  ColorBodyModel,
  ColorIdParamModel,
  EventIdParamModel,
  PaletteQueryModel,
} from "@blurple-canvas-web/types";
import { Router } from "express";
import { requireCanvasAdmin } from "@/middleware/canvasAuth";
import { typedRouter } from "@/middleware/typedRouter";
import { validate } from "@/middleware/validate";
import { audit } from "@/services/auditLogService";
import {
  assignColorToEvent,
  createColor,
  deleteColor,
  editColor,
  getCurrentEventPalette,
  getEventPalette,
  unassignColorFromEvent,
} from "@/services/paletteService";
import { addSpanAttributes } from "@/utils/otel";

export const paletteRouter = typedRouter(Router());

paletteRouter.get(
  "/current",
  validate({ query: PaletteQueryModel }),
  async (req, res) => {
    addSpanAttributes(req, {
      "event.id": "current",
      "query.all_colors": req.query.allColors,
    });

    const palette = await getCurrentEventPalette(req.query.allColors);
    res.status(200).json(palette);

    addSpanAttributes(req, { "response.size": palette.length });
  },
);

paletteRouter.get(
  "/:eventId",
  validate({ params: EventIdParamModel, query: PaletteQueryModel }),
  async (req, res) => {
    addSpanAttributes(req, {
      "event.id": req.params.eventId,
      "query.all_colors": req.query.allColors,
    });

    const palette = await getEventPalette(
      req.params.eventId,
      req.query.allColors,
    );
    res.status(200).json(palette);

    addSpanAttributes(req, { "response.size": palette.length });
  },
);

paletteRouter.post(
  "/",
  requireCanvasAdmin,
  validate({ body: ColorBodyModel }),
  async (req, res) => {
    addSpanAttributes(req, {
      "params.color.name": req.body.name,
      "params.color.code": req.body.code,
      "params.color.global": req.body.global,
      "params.color.rgba":
        req.body.rgba ?
          `rgba(${req.body.rgba[0]},${req.body.rgba[1]},${req.body.rgba[2]},${req.body.rgba[3]})`
        : false,
    });

    const color = await createColor(req.body);
    res.status(201).json({ message: "Color created" });
    void audit(req, "admin", "color.create", {
      resourceId: color.id,
      metadata: req.body,
    });
    addSpanAttributes(req, {
      "params.color.id": color.id,
    });
  },
);

paletteRouter.put(
  "/:colorId",
  requireCanvasAdmin,
  validate({ params: ColorIdParamModel, body: ColorBodyModel }),
  async (req, res) => {
    addSpanAttributes(req, {
      "params.color.id": req.params.colorId,
      "params.color.name": req.body.name,
      "params.color.code": req.body.code,
      "params.color.global": req.body.global,
      "params.color.rgba":
        req.body.rgba ?
          `rgba(${req.body.rgba[0]},${req.body.rgba[1]},${req.body.rgba[2]},${req.body.rgba[3]})`
        : false,
    });

    await editColor({
      colorId: req.params.colorId,
      data: req.body,
    });
    res.status(200).json({ message: "Color edited" });
    void audit(req, "admin", "color.update", {
      resourceId: req.params.colorId,
      metadata: req.body,
    });
  },
);

paletteRouter.delete(
  "/:colorId",
  requireCanvasAdmin,
  validate({ params: ColorIdParamModel }),
  async (req, res) => {
    addSpanAttributes(req, {
      "params.color.id": req.params.colorId,
    });

    await deleteColor(req.params.colorId);
    res.status(204).end();
    void audit(req, "admin", "color.delete", {
      resourceId: req.params.colorId,
    });
  },
);

paletteRouter.post(
  "/:colorId/assign/:eventId/:guildId",
  requireCanvasAdmin,
  validate({ params: AssignColorParamModel }),
  async (req, res) => {
    addSpanAttributes(req, {
      "event.id": req.params.eventId,
      "params.color.id": req.params.colorId,
      "params.guild.id": req.params.guildId,
    });

    await assignColorToEvent({
      colorId: req.params.colorId,
      eventId: req.params.eventId,
      guildId: BigInt(req.params.guildId),
    });
    res.status(200).json({ message: "Color assigned to event" });
    void audit(req, "admin", "participation.assign", {
      resourceId: `${req.params.colorId}:${req.params.eventId}:${req.params.guildId}`,
      metadata: {
        colorId: req.params.colorId,
        eventId: req.params.eventId,
        guildId: req.params.guildId,
      },
    });
  },
);

paletteRouter.delete(
  "/:colorId/assign/:eventId/:guildId",
  requireCanvasAdmin,
  validate({ params: AssignColorParamModel }),
  async (req, res) => {
    addSpanAttributes(req, {
      "event.id": req.params.eventId,
      "params.color.id": req.params.colorId,
      "params.guild.id": req.params.guildId,
    });

    await unassignColorFromEvent({
      eventId: req.params.eventId,
      guildId: BigInt(req.params.guildId),
    });
    res.status(204).end();
    void audit(req, "admin", "participation.unassign", {
      resourceId: `${req.params.colorId}:${req.params.eventId}:${req.params.guildId}`,
      metadata: {
        eventId: req.params.eventId,
        guildId: req.params.guildId,
      },
    });
  },
);
