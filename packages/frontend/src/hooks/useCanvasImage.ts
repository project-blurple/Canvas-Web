import { useEffect, useState } from "react";
import config from "@/config/clientConfig";

export function useCanvasImage(canvasId: number): HTMLImageElement | null {
  const [sourceImage, setSourceImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    const image = new Image();
    image.decoding = "async";
    image.crossOrigin = "anonymous";
    image.src = `${config.apiUrl}/api/v1/canvas/${canvasId}/1.png`;

    image.onload = () => {
      if (!cancelled) {
        setSourceImage(image);
      }
    };

    image.onerror = () => {
      if (!cancelled) {
        setSourceImage(null);
      }
    };

    return () => {
      cancelled = true;
    };
  }, [canvasId]);

  return sourceImage;
}
