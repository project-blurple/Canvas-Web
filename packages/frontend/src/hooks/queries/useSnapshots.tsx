"use client";

import type { CanvasInfo, SnapshotRequest } from "@blurple-canvas-web/types";
import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import axios from "axios";
import config from "@/config/clientConfig";

export function useSnapshots(
  canvasId?: CanvasInfo["id"],
  useQueryOptions?: Omit<
    UseQueryOptions<SnapshotRequest.ResBody>,
    "queryKey" | "queryFn"
  >,
) {
  const getSnapshots = async () => {
    if (!canvasId) return [];

    const response = await axios.get<SnapshotRequest.ResBody>(
      `${config.apiUrl}/api/v1/canvas/${encodeURIComponent(canvasId)}/snapshots`,
    );

    return response.data;
  };

  return useQuery<SnapshotRequest.ResBody>({
    queryKey: ["snapshots", canvasId],
    queryFn: getSnapshots,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    enabled: Boolean(canvasId),
    ...useQueryOptions,
  });
}
