"use client";

import { CanvasInfo, LeaderboardRequest } from "@blurple-canvas-web/types";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import config from "@/config";

export function useLeaderboard(canvasId: CanvasInfo["id"]) {
  const getLeaderboard = async () => {
    const response = await axios.get<LeaderboardRequest.ResBody>(
      `${config.apiUrl}/api/v1/statistics/leaderboard/${encodeURIComponent(canvasId)}`,
    );
    return response.data;
  };

  return useQuery({
    queryKey: ["leaderboard", canvasId],
    queryFn: getLeaderboard,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}
