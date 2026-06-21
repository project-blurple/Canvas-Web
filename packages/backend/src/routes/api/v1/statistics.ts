import {
  CanvasColorStatsParamModel,
  CanvasIdParamModel,
  EventIdParamModel,
  FrameColorStatsParamModel,
  FrameIdParamModel,
  LeaderboardQueryModel,
  UserCanvasParamModel,
} from "@blurple-canvas-web/types";
import { Router } from "express";
import { typedRouter } from "@/middleware/typedRouter";
import { validate } from "@/middleware/validate";
import {
  getCanvasColorLeaderboard,
  getCanvasLeaderboard,
  getCanvasStatisticsSummary,
  getEventStatisticsSummary,
  getFrameColorLeaderboard,
  getFrameLeaderboard,
  getFrameStatisticsSummary,
  getUserStats,
} from "@/services/statisticsService";
import { addSpanAttributes } from "@/utils/otel";

export const statisticsRouter = typedRouter(Router());

statisticsRouter.get(
  "/user/:userId/:canvasId",
  validate({ params: UserCanvasParamModel }),
  async (req, res) => {
    addSpanAttributes(req, {
      "query.user.id": req.params.userId,
      "canvas.id": req.params.canvasId,
    });

    const stats = await getUserStats(req.params.userId, req.params.canvasId);
    res.status(200).json(stats);
  },
);

statisticsRouter.get(
  "/leaderboard/canvas/:canvasId",
  validate({ params: CanvasIdParamModel, query: LeaderboardQueryModel }),
  async (req, res) => {
    addSpanAttributes(req, {
      "canvas.id": req.params.canvasId,
      "query.page": req.query.page ?? false,
      "query.size": req.query.size ?? false,
    });

    const leaderboard = await getCanvasLeaderboard({
      canvasId: req.params.canvasId,
      page: req.query.page,
      size: req.query.size,
    });
    res.status(200).json(leaderboard);

    addSpanAttributes(req, { "response.size": leaderboard.size });
  },
);

statisticsRouter.get(
  "/leaderboard/canvas/:canvasId/color/:colorId",
  validate({
    params: CanvasColorStatsParamModel,
    query: LeaderboardQueryModel,
  }),
  async (req, res) => {
    addSpanAttributes(req, {
      "canvas.id": req.params.canvasId,
      "color.id": req.params.colorId,
      "query.page": req.query.page ?? false,
      "query.size": req.query.size ?? false,
    });

    const leaderboard = await getCanvasColorLeaderboard({
      canvasId: req.params.canvasId,
      colorId: req.params.colorId,
      page: req.query.page,
      size: req.query.size,
    });
    res.status(200).json(leaderboard);

    addSpanAttributes(req, { "response.size": leaderboard.size });
  },
);

statisticsRouter.get(
  "/leaderboard/frame/:frameId",
  validate({ params: FrameIdParamModel, query: LeaderboardQueryModel }),
  async (req, res) => {
    addSpanAttributes(req, {
      "frame.id": req.params.frameId,
      "query.page": req.query.page ?? false,
      "query.size": req.query.size ?? false,
    });

    const leaderboard = await getFrameLeaderboard({
      frameId: req.params.frameId,
      page: req.query.page,
      size: req.query.size,
    });
    res.status(200).json(leaderboard);

    addSpanAttributes(req, { "response.size": leaderboard.size });
  },
);

statisticsRouter.get(
  "/leaderboard/frame/:frameId/color/:colorId",
  validate({
    params: FrameColorStatsParamModel,
    query: LeaderboardQueryModel,
  }),
  async (req, res) => {
    addSpanAttributes(req, {
      "frame.id": req.params.frameId,
      "color.id": req.params.colorId,
      "query.page": req.query.page ?? false,
      "query.size": req.query.size ?? false,
    });

    const leaderboard = await getFrameColorLeaderboard({
      frameId: req.params.frameId,
      colorId: req.params.colorId,
      page: req.query.page,
      size: req.query.size,
    });
    res.status(200).json(leaderboard);

    addSpanAttributes(req, { "response.size": leaderboard.size });
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

statisticsRouter.get(
  "/summary/frame/:frameId",
  validate({ params: FrameIdParamModel }),
  async (req, res) => {
    addSpanAttributes(req, { "frame.id": req.params.frameId });

    const summary = await getFrameStatisticsSummary(req.params.frameId);
    res.status(200).json(summary);
  },
);
