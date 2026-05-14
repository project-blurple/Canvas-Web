"use client";

import type { CanvasListRequest } from "@blurple-canvas-web/types";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import config from "@/config/clientConfig";

export function useCanvasList() {
  const getCanvasList = async () => {
    const response = await axios.get<CanvasListRequest.ResBody>(
      `${config.apiUrl}/api/v1/canvas/`,
    );
    return response.data;
  };

  return useQuery({
    queryKey: ["canvas"],
    queryFn: getCanvasList,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: [] as CanvasListRequest.ResBody,
  });
}
