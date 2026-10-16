"use client";

import type {
  BlurpleEvent,
  PaletteColor,
  PaletteRequest,
} from "@blurple-canvas-web/types";
import {
  type AxiosError,
  type AxiosResponse,
  type UseMutationResult,
  type UseQueryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import axios from "axios";
import Color from "colorjs.io";
import config from "@/config/clientConfig";

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

export function usePalette(
  eventId?: BlurpleEvent["id"],
  allColors = false,
  useQueryOptions?: Omit<
    UseQueryOptions<PaletteRequest.ResBody>,
    "queryKey" | "queryFn"
  >,
) {
  const getPalette = async () => {
    const url = `${config.apiUrl}/api/v1/palette/${eventId ? encodeURIComponent(eventId) : "current"}`;
    const params: PaletteRequest.ReqQuery | undefined =
      allColors ? { allColors: true } : undefined;
    const response = await axios.get<PaletteRequest.ResBody>(url, { params });
    return response.data.sort(sortByOklchHue);
  };

  return useQuery<PaletteRequest.ResBody>({
    ...useQueryOptions,
    queryKey: ["palette", eventId, allColors],
    queryFn: getPalette,
    enabled: useQueryOptions?.enabled ?? true,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

export interface ColorInput {
  code: string;
  name: string;
  global: boolean;
  rgba: [number, number, number, number];
}

export function useCreateColor(): UseMutationResult<
  AxiosResponse<{ message: string }>,
  AxiosError,
  ColorInput
> {
  const queryClient = useQueryClient();

  return useMutation<
    AxiosResponse<{ message: string }>,
    AxiosError,
    ColorInput
  >({
    mutationFn: async (data: ColorInput) => {
      const requestUrl = `${config.apiUrl}/api/v1/palette`;
      return await axios.post(requestUrl, data, {
        withCredentials: true,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["palette"] });
    },
  });
}

export function useEditColor(
  colorId: number,
): UseMutationResult<
  AxiosResponse<{ message: string }>,
  AxiosError,
  ColorInput
> {
  const queryClient = useQueryClient();

  return useMutation<
    AxiosResponse<{ message: string }>,
    AxiosError,
    ColorInput
  >({
    mutationFn: async (data: ColorInput) => {
      const requestUrl = `${config.apiUrl}/api/v1/palette/${encodeURIComponent(colorId)}`;
      return await axios.put(requestUrl, data, {
        withCredentials: true,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["palette"] });
    },
  });
}
