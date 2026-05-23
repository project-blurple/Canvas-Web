import type { Cooldown } from "@blurple-canvas-web/types";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import config from "@/config/clientConfig";

export function useCanvasCooldown(canvasId: number, enabled: boolean) {
  const getCanvasCooldown = async () => {
    const { data } = await axios.get<Cooldown>(
      `${config.apiUrl}/api/v1/canvas/${encodeURIComponent(canvasId)}/cooldown/@me`,
      {
        withCredentials: true,
      },
    );
    return data;
  };

  return useQuery<Cooldown>({
    queryKey: ["canvasCooldown", canvasId],
    queryFn: getCanvasCooldown,
    enabled,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    retry: false,
  });
}
