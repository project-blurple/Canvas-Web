"use client";

import { CanvasListRequest } from "@blurple-canvas-web/types";
import { useQuery } from "@tanstack/react-query";
import { useApiContext } from "@/contexts/ApiProvider";

export function useCanvasList() {
  const api = useApiContext();
  const getCanvasList = async () => {
    return await api.get<CanvasListRequest.ResBody>("canvas").json();
  };

  return useQuery({
    queryKey: ["canvas"],
    queryFn: getCanvasList,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: [] as CanvasListRequest.ResBody,
  });
}
