"use client";

import type {
  CanvasInfo,
  LeaderboardRequest,
  PaletteColorSummary,
} from "@blurple-canvas-web/types";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import axios from "axios";
import config from "@/config/clientConfig";

interface UseLeaderboardParams {
  page?: number;
  size?: number;
  colorId?: PaletteColorSummary["id"];
}

export function useCanvasLeaderboard(
  canvasId: CanvasInfo["id"],
  { page = 1, size = 10, colorId }: UseLeaderboardParams,
) {
  const getLeaderboard = async (): Promise<LeaderboardRequest.ResBody> => {
    const baseUrl = `${config.apiUrl}/api/v1/statistics/leaderboard/canvas/${encodeURIComponent(
      canvasId,
    )}`;
    const url =
      colorId ? `${baseUrl}/color/${encodeURIComponent(colorId)}` : baseUrl;

    const response = await axios.get<LeaderboardRequest.ResBody>(url, {
      params: { page, size },
    });
    return response.data;
  };

  return useQuery<LeaderboardRequest.ResBody>({
    queryKey: ["leaderboard", canvasId, { page, size, colorId }],
    queryFn: getLeaderboard,
    placeholderData: keepPreviousData,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: 30_000, // 30 seconds
  });
}
