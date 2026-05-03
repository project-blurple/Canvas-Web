"use client";

import type {
  BlurpleEvent,
  PaletteColor,
  PaletteRequest,
} from "@blurple-canvas-web/types";
import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import axios from "axios";
import Color from "colorjs.io";
import config from "@/config/clientConfig";

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

export function usePalette(
  eventId?: BlurpleEvent["id"],
  useQueryOptions?: Omit<
    UseQueryOptions<PaletteRequest.ResBody>,
    "queryKey" | "queryFn"
  >,
) {
  const getPalette = async () => {
    const response = await axios.get<PaletteRequest.ResBody>(
      `${config.apiUrl}/api/v1/palette/${eventId ? encodeURIComponent(eventId) : "current"}`,
    );
    return response.data.sort(sortByOklchHue);
  };

  return useQuery<PaletteRequest.ResBody>({
    queryKey: ["palette", eventId],
    queryFn: getPalette,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: [] as PaletteRequest.ResBody,
    ...useQueryOptions,
  });
}
