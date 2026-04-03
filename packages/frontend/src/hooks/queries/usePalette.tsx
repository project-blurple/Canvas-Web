"use client";

import { BlurpleEvent, PaletteRequest } from "@blurple-canvas-web/types";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import Color, { Coords } from "colorjs.io";
import config from "@/config";

export function usePalette(eventId?: BlurpleEvent["id"]) {
  const getPalette = async () => {
    const response = await axios.get<PaletteRequest.ResBody>(
      `${config.apiUrl}/api/v1/palette/${eventId ?? "current"}`,
    );
    return response.data.sort((a, b) => {
      const rgbA = a.rgba.slice(0, 3) as Coords;
      const rgbB = b.rgba.slice(0, 3) as Coords;
      const hueA = new Color("srgb", rgbA).to("oklch").coords[2];
      const hueB = new Color("srgb", rgbB).to("oklch").coords[2];
      return hueA - hueB;
    });
  };

  return useQuery({
    queryKey: ["palette", eventId],
    queryFn: getPalette,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: [] as PaletteRequest.ResBody,
  });
}
