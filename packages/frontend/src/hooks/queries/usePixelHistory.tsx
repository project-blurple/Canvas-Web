"use client";

import type {
  CanvasInfo,
  HistoryRequest,
  Point,
} from "@blurple-canvas-web/types";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useState } from "react";
import config from "@/config/clientConfig";

const emptyHistoryResult = (): HistoryRequest.ResBody => ({
  pixelHistory: [],
  totalEntries: 0,
  historyIds: [],
  users: {},
});

export function usePixelHistory(
  canvasId: CanvasInfo["id"],
  coordinates: Point | null,
) {
  const fetchHistory = async ({ signal }: { signal: AbortSignal }) => {
    if (!coordinates) return emptyHistoryResult();

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
    queryKey: ["pixelHistory", canvasId, coordinates],
    queryFn: fetchHistory,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

export interface ComplexPixelHistoryQuery {
  point0: Point;
  point1?: Point;
  fromDateTime?: string;
  toDateTime?: string;
  includeUserIds?: string[];
  excludeUserIds?: string[];
  includeColors?: string[];
  excludeColors?: string[];
}

export function useComplexPixelHistory(
  canvasId: CanvasInfo["id"],
  query: ComplexPixelHistoryQuery | null,
) {
  const [lastDurationMs, setLastDurationMs] = useState<number | null>(null);

  const fetchComplexHistory = async ({ signal }: { signal: AbortSignal }) => {
    if (!query) return null;

    const startedAt = performance.now();

    try {
      const response = await axios.post<HistoryRequest.ResBody>(
        `${config.apiUrl}/api/v1/canvas/${encodeURIComponent(canvasId)}/pixel/history`,
        {
          fromDateTime: query.fromDateTime,
          toDateTime: query.toDateTime,
          includeUserIds: query.includeUserIds,
          excludeUserIds: query.excludeUserIds,
          includeColors: query.includeColors,
          excludeColors: query.excludeColors,
        },
        {
          params: {
            x0: query.point0.x,
            y0: query.point0.y,
            x1: query.point1?.x,
            y1: query.point1?.y,
          },
          signal,
          withCredentials: true,
        },
      );
      return response.data;
    } finally {
      setLastDurationMs(performance.now() - startedAt);
    }
  };

  const queryResult = useQuery({
    queryKey: ["complexPixelHistory", canvasId, query],
    queryFn: fetchComplexHistory,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  return {
    ...queryResult,
    lastDurationMs,
  };
}
