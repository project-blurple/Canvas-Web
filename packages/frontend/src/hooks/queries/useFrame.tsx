"use client";

import type {
  CanvasInfo,
  DiscordGuildRecord,
  DiscordUserProfile,
  Frame,
  FrameRequest,
} from "@blurple-canvas-web/types";
import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import axios from "axios";
import config from "@/config/clientConfig";
import { isSystemFrameId, reconstructSystemFrame } from "@/util/frame";
import { fetchFrameById } from "./serverFetch";

interface UseUserFramesParams {
  canvasId: Frame["canvasId"];
  userId?: DiscordUserProfile["id"];
}

interface UseFrameByIdParams {
  frameId?: Frame["id"];
  canvas?: CanvasInfo;
}

interface UseGuildFramesParams {
  canvasId: Frame["canvasId"];
  guildIds?: DiscordGuildRecord["guild_id"][];
}

export function useFrameById({ frameId, canvas }: UseFrameByIdParams) {
  // System frames are client-side only and don't exist in the database
  // Skip the API call for system frames to avoid 404 errors
  return useQuery<FrameRequest.FrameByIdResBody | null>({
    queryKey: ["frame", "id", frameId],
    queryFn: () => {
      if (canvas) {
        const systemFrame = reconstructSystemFrame(frameId, canvas);
        if (systemFrame) {
          return systemFrame;
        }
      }
      return fetchFrameById(frameId);
    },
    enabled: Boolean(frameId),
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: null,
  });
}

export function useUserFrames(
  { canvasId, userId }: UseUserFramesParams,
  options?: Omit<
    UseQueryOptions<FrameRequest.UserFramesResBody>,
    "queryKey" | "queryFn"
  >,
) {
  const { enabled = true } = options ?? {};

  const getFrames = async (): Promise<FrameRequest.UserFramesResBody> => {
    if (!userId) return {} as FrameRequest.UserFramesResBody;

    const response = await axios.get<FrameRequest.UserFramesResBody>(
      `${config.apiUrl}/api/v1/frame/user/${encodeURIComponent(userId)}/${encodeURIComponent(canvasId)}`,
    );
    return response.data;
  };

  return useQuery<FrameRequest.UserFramesResBody>({
    ...options,
    queryKey: ["frame", "user", canvasId, userId],
    queryFn: getFrames,
    enabled: enabled && Boolean(userId),
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: {} as FrameRequest.UserFramesResBody,
  });
}

export function useGuildFrames<TData = FrameRequest.GuildFramesResBody>(
  { canvasId, guildIds }: UseGuildFramesParams,
  options?: Omit<
    UseQueryOptions<FrameRequest.GuildFramesResBody, Error, TData>,
    "queryKey" | "queryFn"
  >,
) {
  const { enabled = true } = options ?? {};

  const getFrames = async (): Promise<FrameRequest.GuildFramesResBody> => {
    if (!guildIds || guildIds.length === 0)
      return {} as FrameRequest.GuildFramesResBody;

    const response = await axios.get<FrameRequest.GuildFramesResBody>(
      `${config.apiUrl}/api/v1/frame/guilds/${encodeURIComponent(canvasId)}`,
      {
        params: {
          guildIds: guildIds.map(encodeURIComponent),
        },
        paramsSerializer: {
          // This is needed to send the guildIds as repeated query parameters (e.g., guildIds=1&guildIds=2) instead of a comma-separated list (e.g., guildIds=1,2)
          indexes: null,
        },
      },
    );

    return response.data;
  };

  return useQuery<FrameRequest.GuildFramesResBody, Error, TData>({
    ...options,
    queryKey: ["frame", "guild", canvasId, guildIds],
    queryFn: getFrames,
    enabled: enabled && Boolean(guildIds?.length),
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: {} as FrameRequest.GuildFramesResBody,
  });
}
