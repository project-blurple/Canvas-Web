"use client";

import type {
  BlurpleEvent,
  PaletteColor,
  PaletteRequest,
} from "@blurple-canvas-web/types";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import Color from "colorjs.io";
import config from "@/config";

function sortByOklchHue(a: PaletteColor, b: PaletteColor) {
  const rgbA = a.rgba.slice(0, 3) as [number, number, number];
  const rgbB = b.rgba.slice(0, 3) as [number, number, number];
  const hueA = new Color("srgb", rgbA).to("oklch").coords[2];
  const hueB = new Color("srgb", rgbB).to("oklch").coords[2];
  if (hueA && hueB) return hueA - hueB;
  // Everything below should be unreachable in practice
  if (hueA === null) return 1;
  if (hueB == null) return -1;
  return 0;
}

export function usePalette(eventId?: BlurpleEvent["id"], allColors = false) {
  const getPalette = async () => {
    const url = `${config.apiUrl}/api/v1/palette/${eventId ? encodeURIComponent(eventId) : "current"}`;
    const params: PaletteRequest.ReqQuery | undefined =
      allColors ? { allColors: true } : undefined;
    const response = await axios.get<PaletteRequest.ResBody>(url, { params });
    return response.data.sort(sortByOklchHue);
  };

  return useQuery({
    queryKey: ["palette", eventId, allColors],
    queryFn: getPalette,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: [] as PaletteRequest.ResBody,
  });
}
