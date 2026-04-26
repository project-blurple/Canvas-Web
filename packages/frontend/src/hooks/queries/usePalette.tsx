"use client";

import {
  BlurpleEvent,
  PaletteColor,
  PaletteRequest,
} from "@blurple-canvas-web/types";
import { useQuery } from "@tanstack/react-query";
import Color from "colorjs.io";
import { useApiContext } from "@/contexts";

function sortByOklchHue(a: PaletteColor, b: PaletteColor) {
  const rgbA = a.rgba.slice(0, 3) as [number, number, number];
  const rgbB = b.rgba.slice(0, 3) as [number, number, number];
  const hueA = new Color("srgb", rgbA).to("oklch").coords[2];
  const hueB = new Color("srgb", rgbB).to("oklch").coords[2];
  if (hueA && hueB) return hueA - hueB;
  // Everything below should be unreachable in pratice
  if (hueA === null) return 1;
  if (hueB == null) return -1;
  return 0;
}

export function usePalette(eventId?: BlurpleEvent["id"]) {
  const api = useApiContext();
  const getPalette = async () => {
    const response = await api
      .get<PaletteRequest.ResBody>(
        `palette/${eventId ? encodeURIComponent(eventId) : "current"}`,
      )
      .json();
    return response.sort(sortByOklchHue);
  };

  return useQuery({
    queryKey: ["palette", eventId],
    queryFn: getPalette,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: [] as PaletteRequest.ResBody,
  });
}
