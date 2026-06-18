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

export interface PixelHistoryParams {
  point: Point;
  page?: number;
  size?: number;
}

export function usePixelHistory(
  canvasId: CanvasInfo["id"],
  params: PixelHistoryParams | null,
  options?: Omit<
    UseQueryOptions<HistoryRequest.ResBody>,
    "queryKey" | "queryFn"
  >,
) {
  const fetchHistory = async ({ signal }: { signal: AbortSignal }) => {
    if (!params) return emptyHistoryResult();

    const response = await axios.get<HistoryRequest.ResBody>(
      `${config.apiUrl}/api/v1/canvas/${encodeURIComponent(canvasId)}/pixel/history`,
      {
        params: {
          x: params.point.x,
          y: params.point.y,
          page: params.page ?? 1,
          size: params.size ?? 20,
        },
        signal,
        withCredentials: true,
      },
    );

    return response.data;
  };

  return useQuery({
    ...options,
    queryKey: ["pixelHistory", canvasId, params],
    queryFn: fetchHistory,
    placeholderData: keepPreviousData,
    enabled: Boolean(params) && (options?.enabled ?? true),
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: 30_000, // 30 seconds
  });
}

export interface ComplexPixelHistoryParams {
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
  params: ComplexPixelHistoryParams | null,
) {
  const fetchComplexHistory = async ({ signal }: { signal: AbortSignal }) => {
    if (!params) return null;

    const response = await axios.post<HistoryRequest.ResBody>(
      `${config.apiUrl}/api/v1/canvas/${encodeURIComponent(canvasId)}/pixel/history`,
      {
        fromDateTime: params.fromDateTime,
        toDateTime: params.toDateTime,
        includeUserIds: params.includeUserIds,
        excludeUserIds: params.excludeUserIds,
        includeColors: params.includeColors,
        excludeColors: params.excludeColors,
      },
      {
        params: {
          x0: params.point0.x,
          y0: params.point0.y,
          x1: params.point1?.x,
          y1: params.point1?.y,
          page: params.page,
          size: params.size,
        },
        signal,
        withCredentials: true,
      },
    );

    return response.data;
  };

  return useQuery({
    queryKey: ["complexPixelHistory", canvasId, params],
    queryFn: fetchComplexHistory,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}
