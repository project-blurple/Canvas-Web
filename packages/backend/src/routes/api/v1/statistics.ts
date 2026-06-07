import {
  CanvasIdParamModel,
  EventIdParamModel,
  LeaderboardQueryModel,
  UserCanvasParamModel,
} from "@blurple-canvas-web/types";
import { Router } from "express";
import { typedRouter } from "@/middleware/typedRouter";
import { validate } from "@/middleware/validate";
import {
  getCanvasStatisticsSummary,
  getEventStatisticsSummary,
  getLeaderboard,
  getUserStats,
} from "@/services/statisticsService";
import { addSpanAttributes } from "@/utils/otel";

export const statisticsRouter = typedRouter(Router());

statisticsRouter.get(
  "/user/:userId/:canvasId",
  validate({ params: UserCanvasParamModel }),
  async (req, res) => {
    addSpanAttributes(req, {
      "params.user.id": req.params.userId,
      "canvas.id": req.params.canvasId,
    });

    const stats = await getUserStats(req.params.userId, req.params.canvasId);
    res.status(200).json(stats);
  },
);

statisticsRouter.get(
  "/leaderboard/:canvasId",
  validate({ params: CanvasIdParamModel, query: LeaderboardQueryModel }),
  async (req, res) => {
    addSpanAttributes(req, {
      "canvas.id": req.params.canvasId,
      "query.page": req.query.page ?? false,
      "query.size": req.query.size ?? false,
    });

    const leaderboard = await getLeaderboard(
      req.params.canvasId,
      req.query.page,
      req.query.size,
    );
    res.status(200).json(leaderboard);
  },
);

statisticsRouter.get(
  "/summary/canvas/:canvasId",
  validate({ params: CanvasIdParamModel }),
  async (req, res) => {
    addSpanAttributes(req, { "canvas.id": req.params.canvasId });

    const summary = await getCanvasStatisticsSummary(req.params.canvasId);
    res.status(200).json(summary);
  },
);

statisticsRouter.get(
  "/summary/event/:eventId",
  validate({ params: EventIdParamModel }),
  async (req, res) => {
    addSpanAttributes(req, { "event.id": req.params.eventId });

    const summary = await getEventStatisticsSummary(req.params.eventId);
    res.status(200).json(summary);
  },
);
