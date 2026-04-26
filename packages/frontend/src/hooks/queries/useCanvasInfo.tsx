"use client";

import type { CanvasInfo, CanvasInfoRequest } from "@blurple-canvas-web/types";
import { useQuery } from "@tanstack/react-query";
import { useApiContext } from "@/contexts";

export function useCanvasInfo(canvasId?: CanvasInfo["id"]) {
  const api = useApiContext();
  const getMainCanvasInfo = async () => {
    return await api
      .get<CanvasInfoRequest.ResBody>(
        `/api/v1/canvas/${canvasId ? encodeURIComponent(canvasId) : "current"}/info`,
      )
      .json();
  };

  return useQuery<CanvasInfoRequest.ResBody>({
    queryKey: ["canvasInfo", canvasId],
    queryFn: getMainCanvasInfo,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}
