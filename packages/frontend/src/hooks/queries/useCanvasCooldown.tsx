import type { Cooldown } from "@blurple-canvas-web/types";
import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import axios from "axios";
import config from "@/config/clientConfig";

export function useCanvasCooldown(
  canvasId: number,
  options?: Omit<UseQueryOptions<Cooldown>, "queryKey" | "queryFn">,
) {
  const { enabled = true } = options ?? {};

  const getCanvasCooldown = async (): Promise<Cooldown> => {
    const { data } = await axios.get<Cooldown>(
      `${config.apiUrl}/api/v1/canvas/${encodeURIComponent(canvasId)}/cooldown/@me`,
      {
        withCredentials: true,
      },
    );
    return {
      cooldownEndTime:
        data.cooldownEndTime == null ?
          undefined
        : Date.now() + data.cooldownEndTime,
    };
  };

  return useQuery<Cooldown>({
    ...options,
    queryKey: ["canvasCooldown", canvasId],
    queryFn: getCanvasCooldown,
    enabled: enabled && Boolean(canvasId),
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
    retry: false,
  });
}
