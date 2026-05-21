import type { PaletteColor } from "@blurple-canvas-web/types";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import config from "@/config/clientConfig";
import { useCanvasContext } from "@/contexts";

export function useCanvasPaste() {
  const { canvas } = useCanvasContext();

  return useMutation({
    mutationFn: async ({
      authorId,
      data,
    }: {
      authorId: string;
      data: [number, number, PaletteColor["id"]][]; // [x, y, colorId]
    }) => {
      const requestUrl = `${config.apiUrl}/api/v1/canvas/${encodeURIComponent(canvas.id)}/paste`;

      await axios.post(requestUrl, {
        data,
        authorId,
      });
    },
  });
}
