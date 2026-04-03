"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";

import config from "@/config";
import {
  CanvasInfo,
  DiscordUserProfile,
  UserStatsRequest,
} from "@blurple-canvas-web/types";

export function useUserStats(
  userId: DiscordUserProfile["id"] | undefined,
  canvasId: CanvasInfo["id"],
) {
  const getUserStats = async () => {
    if (!userId) return null;

    const response = await axios.get<UserStatsRequest.ResBody>(
      `${config.apiUrl}/api/v1/statistics/user/${encodeURIComponent(userId)}/${encodeURIComponent(canvasId)}`,
    );
    return response.data;
  };

  return useQuery({
    queryKey: ["statistics/user", userId, canvasId],
    queryFn: getUserStats,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}
