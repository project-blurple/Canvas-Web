"use client";

import type { CanvasInfo, LeaderboardRequest } from "@blurple-canvas-web/types";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import axios from "axios";
import config from "@/config/clientConfig";

export function useLeaderboard(
  canvasId: CanvasInfo["id"],
  page = 1,
  size = 10,
) {
  const getLeaderboard = async () => {
    const response = await axios.get<LeaderboardRequest.ResBody>(
      `${config.apiUrl}/api/v1/statistics/leaderboard/${encodeURIComponent(canvasId)}`,
      { params: { page, size } },
    );
    return response.data;
  };

  return useQuery({
    queryKey: ["leaderboard", canvasId, { page, size }],
    queryFn: getLeaderboard,
    placeholderData: keepPreviousData,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: 30_000, // 30 seconds
  });
}
