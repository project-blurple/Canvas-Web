import type { CanvasInfo, Frame } from "@blurple-canvas-web/types";
import axios from "axios";
import config from "@/config/clientConfig";

// These functions are defined here so they can be used in server components

export async function fetchCanvasInfo(
  canvasId?: CanvasInfo["id"],
): Promise<CanvasInfo> {
  const id = canvasId === undefined ? "current" : encodeURIComponent(canvasId);
  const response = await axios.get<CanvasInfo>(
    `${config.apiUrl}/api/v1/canvas/${id}/info`,
  );
  return response.data;
}

export async function fetchFrameById(frameId?: string): Promise<Frame | null> {
  if (!frameId) return null;

  const response = await axios.get<Frame>(
    `${config.apiUrl}/api/v1/frame/${encodeURIComponent(frameId)}`,
  );

  return response.data;
}
