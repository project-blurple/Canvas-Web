"use client";

import type {
  CanvasInfo,
  HistoryRequest,
  Point,
} from "@blurple-canvas-web/types";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import config from "@/config";

export function usePixelHistory(
  canvasId: CanvasInfo["id"],
  coordinates: Point | null,
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
  const fetchComplexHistory = async () => {
    if (!query)
      return { pixelHistory: [], totalEntries: 0 } as HistoryRequest.ResBody;

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
        withCredentials: true,
      },
    );
    console.log(response);
    return response.data;
  };

  return useQuery({
    queryKey: ["complexPixelHistory", canvasId, query],
    queryFn: fetchComplexHistory,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}
