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
import {
  assignColorToEvent,
  createColor,
  deleteColor,
  editColor,
  getCurrentEventPalette,
  getEventPalette,
  unassignColorFromEvent,
} from "@/services/paletteService";

export const paletteRouter = typedRouter(Router());

paletteRouter.get(
  "/current",
  validate({ query: PaletteQueryModel }),
  async (req, res) => {
    const palette = await getCurrentEventPalette(req.query.allColors);
    res.status(200).json(palette);
  },
);

paletteRouter.get(
  "/:eventId",
  validate({ params: EventIdParamModel, query: PaletteQueryModel }),
  async (req, res) => {
    const palette = await getEventPalette(
      req.params.eventId,
      req.query.allColors,
    );
    res.status(200).json(palette);
  },
);

paletteRouter.post(
  "/",
  requireCanvasAdmin,
  validate({ body: ColorBodyModel }),
  async (req, res) => {
    await createColor(req.body);
    res.status(201).json({ message: "Color created" });
  },
);

paletteRouter.put(
  "/:colorId",
  requireCanvasAdmin,
  validate({ params: ColorIdParamModel, body: ColorBodyModel }),
  async (req, res) => {
    await editColor({
      colorId: req.params.colorId,
      data: req.body,
    });
    res.status(200).json({ message: "Color edited" });
  },
);

paletteRouter.delete(
  "/:colorId",
  requireCanvasAdmin,
  validate({ params: ColorIdParamModel }),
  async (req, res) => {
    await deleteColor(req.params.colorId);
    res.status(204).end();
  },
);

paletteRouter.post(
  "/:colorId/assign/:eventId/:guildId",
  requireCanvasAdmin,
  validate({ params: AssignColorParamModel }),
  async (req, res) => {
    await assignColorToEvent({
      colorId: req.params.colorId,
      eventId: req.params.eventId,
      guildId: BigInt(req.params.guildId),
    });
    res.status(200).json({ message: "Color assigned to event" });
  },
);

paletteRouter.delete(
  "/:colorId/assign/:eventId/:guildId",
  requireCanvasAdmin,
  validate({ params: AssignColorParamModel }),
  async (req, res) => {
    // Color ID isn't actually used here, but I'm not sure how else to structure the route
    await unassignColorFromEvent({
      eventId: req.params.eventId,
      guildId: BigInt(req.params.guildId),
    });
    res.status(204).end();
  },
);
