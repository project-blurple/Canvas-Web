"use client";

import type { CanvasInfo, LeaderboardRequest } from "@blurple-canvas-web/types";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useApiContext } from "@/contexts";

export function useLeaderboard(
  canvasId: CanvasInfo["id"],
  page = 1,
  size = 10,
) {
  const api = useApiContext();
  const getLeaderboard = async () => {
    return await api
      .get<LeaderboardRequest.ResBody>(
        `/api/v1/statistics/leaderboard/${encodeURIComponent(canvasId)}`,
        { searchParams: { page, size } },
      )
      .json();
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
