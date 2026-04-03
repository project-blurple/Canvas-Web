import { Router } from "express";
import { ApiError, BadRequestError } from "@/errors";
import { LeaderboardQueryModel, parseCanvasId } from "@/models/paramModels";
import { getLeaderboard, getUserStats } from "@/services/statisticsService";

export const statisticsRouter = Router();

statisticsRouter.get("/user/:userId/:canvasId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const canvasId = await parseCanvasId({ canvasId: req.params.canvasId });
    const stats = await getUserStats(userId, canvasId);
    res.status(200).json(stats);
  } catch (error) {
    ApiError.sendError(res, error);
  }
});

statisticsRouter.get("/leaderboard/:canvasId", async (req, res) => {
  try {
    const [canvasId, queryParams] = await Promise.all([
      parseCanvasId(req.params),
      LeaderboardQueryModel.safeParseAsync(req.query),
    ]);

    if (!queryParams.success) {
      throw new BadRequestError(
        "Malformed query parameters",
        queryParams.error.issues,
      );
    }

    const { size } = queryParams.data;
    const leaderboard = await getLeaderboard(canvasId, size);

    res.status(200).json(leaderboard);
  } catch (error) {
    ApiError.sendError(res, error);
  }
});
