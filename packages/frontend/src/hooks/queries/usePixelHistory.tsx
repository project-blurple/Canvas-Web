"use client";

import type {
  CanvasInfo,
  HistoryRequest,
  Point,
} from "@blurple-canvas-web/types";
import { useQuery } from "@tanstack/react-query";
import { useApiContext } from "@/contexts";

export function usePixelHistory(
  canvasId: CanvasInfo["id"],
  coordinates: Point | null,
) {
  const api = useApiContext();
  const fetchHistory = async ({ signal }: { signal: AbortSignal }) => {
    if (!coordinates) {
      throw new Error(
        `usePixelHistory query function called with ${coordinates} \`coordinates\``,
      );
    }

    const { x, y } = coordinates;
    return await api
      .get<HistoryRequest.ResBody>(
        `canvas/${encodeURIComponent(canvasId)}/pixel/history`,
        {
          searchParams: { x, y },
          signal,
        },
      )
      .json();
  };

  return useQuery({
    queryKey: ["pixelHistory", canvasId, coordinates],
    queryFn: fetchHistory,
    enabled: coordinates !== null,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}
