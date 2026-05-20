"use client";

import type {
  CanvasInfo,
  CanvasStatisticsSummary,
} from "@blurple-canvas-web/types";
import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import axios from "axios";
import config from "@/config/clientConfig";

export function useCanvasStats(
  canvasId?: CanvasInfo["id"],
  useQueryOptions?: Omit<
    UseQueryOptions<CanvasStatisticsSummary | null>,
    "queryKey" | "queryFn"
  >,
) {
  const getCanvasStats = async () => {
    if (!canvasId) return null;

    const response = await axios.get<CanvasStatisticsSummary>(
      `${config.apiUrl}/api/v1/statistics/summary/canvas/${encodeURIComponent(canvasId)}`,
    );
    return response.data;
  };

  return useQuery<CanvasStatisticsSummary | null>({
    queryKey: ["statistics/summary/canvas", canvasId],
    queryFn: getCanvasStats,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    enabled: Boolean(canvasId),
    ...useQueryOptions,
  });
}
