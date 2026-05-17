"use client";

import type { CanvasInfo, CanvasInfoRequest } from "@blurple-canvas-web/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import config from "@/config/clientConfig";

export function useCanvasInfo(canvasId?: CanvasInfo["id"]) {
  const getMainCanvasInfo = async () => {
    const response = await axios.get<CanvasInfoRequest.ResBody>(
      `${config.apiUrl}/api/v1/canvas/${canvasId ? encodeURIComponent(canvasId) : "current"}/info`,
    );
    return response.data;
  };

  return useQuery<CanvasInfoRequest.ResBody>({
    queryKey: ["canvasInfo", canvasId],
    queryFn: getMainCanvasInfo,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

export function useUpdateCanvasInfo(canvasId: CanvasInfo["id"]) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      data: Partial<Pick<CanvasInfo, "name" | "isLocked" | "cooldownLength">>,
    ) => {
      const requestUrl = `${config.apiUrl}/api/v1/canvas/${encodeURIComponent(canvasId)}`;

      return axios.put(requestUrl, data, {
        withCredentials: true,
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["canvas"] }),
        canvasId === undefined ?
          Promise.resolve()
        : queryClient.invalidateQueries({ queryKey: ["canvasInfo", canvasId] }),
      ]);
    },
  });
}

export function useCreateCanvas() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<CanvasInfo, "eventId">) => {
      const requestUrl = `${config.apiUrl}/api/v1/canvas`;

      return axios.post(requestUrl, data, {
        withCredentials: true,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["canvas"] });
    },
  });
}
