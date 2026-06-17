import { useEffect, useState } from "react";
import config from "@/config/clientConfig";

export function useCanvasImage(canvasId: number): HTMLImageElement | null {
  const [sourceImage, setSourceImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    const image = new Image();
    image.decoding = "async";
    image.crossOrigin = "anonymous";
    image.src = `${config.apiUrl}/api/v1/canvas/${encodeURIComponent(canvasId)}@1.png`;

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

export function useCanvasTimelineVideo(
  canvasId: number,
  enabled = true,
): HTMLVideoElement | null {
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(
    null,
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.src = `${config.apiUrl}/api/v1/canvas/${encodeURIComponent(canvasId)}.mp4?raw=true`;

    video.onloadeddata = () => {
      if (!cancelled) setVideoElement(video);
    };

    video.onerror = () => {
      if (!cancelled) setVideoElement(null);
    };

    return () => {
      cancelled = true;
    };
  }, [canvasId, enabled]);

  return videoElement;
}
