import { Router } from "express";
import { typedRouter } from "@/middleware/typedRouter";
import { validate } from "@/middleware/validate";
import { CanvasIdParamModel } from "@/models/canvas.models";
import { parseEventId } from "@/models/event.models";
import {
  LeaderboardQueryModel,
  UserCanvasParamModel,
} from "@/models/pixel.models";
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

statisticsRouter.get("/summary/canvas/:canvasId", async (req, res) => {
  try {
    const canvasId = await parseCanvasId(req.params);
    const summary = await getCanvasStatisticsSummary(canvasId);

    res.status(200).json(summary);
  } catch (error) {
    ApiError.sendError(res, error);
  }
});

statisticsRouter.get("/summary/event/:eventId", async (req, res) => {
  try {
    const eventId = await parseEventId(req.params);
    const summary = await getEventStatisticsSummary(eventId);

    res.status(200).json(summary);
  } catch (error) {
    ApiError.sendError(res, error);
  }
});
