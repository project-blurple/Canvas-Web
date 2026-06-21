"use client";

import type {
  Frame,
  FrameExportPackage,
  FrameStatisticsSummary,
} from "@blurple-canvas-web/types";
import {
  type UseMutationOptions,
  type UseQueryOptions,
  useMutation,
  useQuery,
} from "@tanstack/react-query";
import axios from "axios";
import config from "@/config/clientConfig";

export function useFrameStats(
  frameId?: Frame["id"],
  useQueryOptions?: Omit<
    UseQueryOptions<FrameStatisticsSummary | null>,
    "queryKey" | "queryFn"
  >,
) {
  const getFrameStats = async () => {
    if (!frameId) return null;

    const response = await axios.get<FrameStatisticsSummary>(
      `${config.apiUrl}/api/v1/statistics/summary/frame/${encodeURIComponent(frameId)}`,
    );
    return response.data;
  };

  return useQuery<FrameStatisticsSummary | null>({
    queryKey: ["statistics/summary/frame", frameId],
    queryFn: getFrameStats,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    enabled: Boolean(frameId),
    ...useQueryOptions,
  });
}

export function useFrameExport(
  useMutationOptions?: Omit<
    UseMutationOptions<FrameExportPackage, Error, Frame["id"]>,
    "mutationFn"
  >,
) {
  return useMutation({
    mutationFn: async (frameId: Frame["id"]) => {
      const response = await axios.get<FrameExportPackage>(
        `${config.apiUrl}/api/v1/frame/${encodeURIComponent(frameId)}/export`,
      );
      return response.data;
    },
    ...useMutationOptions,
  });
}
