import { Router } from "express";
import { typedRouter } from "@/middleware/typedRouter";
import { validate } from "@/middleware/validate";
import { CanvasIdParamModel } from "@/models/canvas.models";
import {
  LeaderboardQueryModel,
  UserCanvasParamModel,
} from "@/models/pixel.models";
import { getLeaderboard, getUserStats } from "@/services/statisticsService";

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
