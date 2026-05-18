import type { Cooldown } from "@blurple-canvas-web/types";
import { type UseMutationOptions, useMutation } from "@tanstack/react-query";
import axios from "axios";
import config from "@/config/clientConfig";
import {
  useCanvasContext,
  useCanvasViewContext,
  useSelectedColorContext,
} from "@/contexts";

export default function usePlacePixelMutation(
  useMutationOptions?: Omit<
    UseMutationOptions<Cooldown>,
    "mutationKey" | "mutationFn"
  >,
) {
  const { canvas } = useCanvasContext();
  const { coords } = useCanvasViewContext();
  const { color } = useSelectedColorContext();

  return useMutation<Cooldown>({
    mutationKey: ["pixel", canvas.id, coords],
    mutationFn: async () => {
      if (!coords) {
        throw new Error(
          `usePlacePixelMutation mutation function called with ${coords} coords`,
        );
      }
      if (!color) {
        throw new Error(
          `usePlacePixelMutation mutation function called with ${color} color`,
        );
      }
      const { data } = await axios.post<Cooldown>(
        `${config.apiUrl}/api/v1/canvas/${encodeURIComponent(canvas.id)}/pixel`,
        {
          ...coords,
          colorId: color.id,
        },
        { withCredentials: true },
      );
      return data;
    },
    ...useMutationOptions,
  });
}
