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

export const statisticsRouter = typedRouter(Router());

statisticsRouter.get(
  "/user/:userId/:canvasId",
  validate({ params: UserCanvasParamModel }),
  async (req, res) => {
    const stats = await getUserStats(req.params.userId, req.params.canvasId);
    res.status(200).json(stats);
  },
);

statisticsRouter.get(
  "/leaderboard/:canvasId",
  validate({ params: CanvasIdParamModel, query: LeaderboardQueryModel }),
  async (req, res) => {
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
    const summary = await getCanvasStatisticsSummary(req.params.canvasId);
    res.status(200).json(summary);
  },
);

statisticsRouter.get(
  "/summary/event/:eventId",
  validate({ params: EventIdParamModel }),
  async (req, res) => {
    const summary = await getEventStatisticsSummary(req.params.eventId);
    res.status(200).json(summary);
  },
);
