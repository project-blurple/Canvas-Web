"use client";

import type {
  CanvasInfo,
  HistoryRequest,
  Point,
} from "@blurple-canvas-web/types";
import {
  keepPreviousData,
  type UseQueryOptions,
  useQuery,
} from "@tanstack/react-query";
import axios from "axios";
import config from "@/config/clientConfig";

const emptyHistoryResult = (): HistoryRequest.ResBody => ({
  total: 0,
  page: 1,
  size: 20,
  entries: [],
  executionDurationMs: -1,
});

export interface PixelHistoryQuery {
  point: Point;
  page?: number;
  size?: number;
}

export function usePixelHistory(
  canvasId: CanvasInfo["id"],
  query: PixelHistoryQuery | null,
  options?: Omit<
    UseQueryOptions<HistoryRequest.ResBody>,
    "queryKey" | "queryFn"
  >,
) {
  const fetchHistory = async ({ signal }: { signal: AbortSignal }) => {
    if (!query) return emptyHistoryResult();

    const response = await axios.get<HistoryRequest.ResBody>(
      `${config.apiUrl}/api/v1/canvas/${encodeURIComponent(canvasId)}/pixel/history`,
      {
        params: {
          x: query.point.x,
          y: query.point.y,
          page: query.page ?? 1,
          size: query.size ?? 20,
        },
        signal,
      },
    );

    return response.data;
  };

  const queryResult = useQuery({
    ...options,
    queryKey: ["pixelHistory", canvasId, query],
    queryFn: fetchHistory,
    placeholderData: keepPreviousData,
    enabled: Boolean(query) && (options?.enabled ?? true),
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: 30_000, // 30 seconds
  });

  return queryResult;
}

export interface ComplexPixelHistoryQuery {
  point0: Point;
  point1?: Point;
  page?: number;
  size?: number;
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
  const fetchComplexHistory = async ({ signal }: { signal: AbortSignal }) => {
    if (!query) return null;

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
          page: query.page,
          size: query.size,
        },
        signal,
        withCredentials: true,
      },
    );

    return response.data;
  };

  const queryResult = useQuery({
    queryKey: ["complexPixelHistory", canvasId, query],
    queryFn: fetchComplexHistory,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  return queryResult;
}
