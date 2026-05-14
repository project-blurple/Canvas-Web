"use client";

import type {
  CanvasInfo,
  HistoryRequest,
  Point,
} from "@blurple-canvas-web/types";
import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import axios from "axios";
import config from "@/config/clientConfig";

export function usePixelHistory(
  canvasId: CanvasInfo["id"],
  coordinates: Point | null,
  options?: Omit<
    UseQueryOptions<HistoryRequest.ResBody>,
    "queryKey" | "queryFn"
  >,
) {
  const fetchHistory = async ({ signal }: { signal: AbortSignal }) => {
    if (!coordinates)
      return { pixelHistory: [], totalEntries: 0 } as HistoryRequest.ResBody;

    const { x, y } = coordinates;
    const response = await axios.get<HistoryRequest.ResBody>(
      `${config.apiUrl}/api/v1/canvas/${encodeURIComponent(canvasId)}/pixel/history`,
      {
        params: { x, y },
        signal,
      },
    );
    return response.data;
  };

  return useQuery({
    ...options,
    queryKey: ["pixelHistory", canvasId, coordinates],
    queryFn: fetchHistory,
    enabled: Boolean(coordinates) && (options?.enabled ?? true),
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}
