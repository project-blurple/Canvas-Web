"use client";

import {
  DiscordGuildRecord,
  DiscordUserProfile,
  Frame,
  FrameRequest,
} from "@blurple-canvas-web/types";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import config from "@/config";

interface UseUserFramesParams {
  canvasId: Frame["canvasId"];
  userId?: DiscordUserProfile["id"];
}

interface UseFrameByIdParams {
  frameId?: Frame["id"];
}

interface UseGuildFramesParams {
  canvasId: Frame["canvasId"];
  guildIds?: DiscordGuildRecord["guild_id"][];
}

export function useFrameById({ frameId }: UseFrameByIdParams) {
  const getFrame = async (): Promise<FrameRequest.FrameByIdResBody | null> => {
    if (!frameId) return null;

    const response = await axios.get<FrameRequest.FrameByIdResBody>(
      `${config.apiUrl}/api/v1/frame/${encodeURIComponent(frameId)}`,
    );

    return response.data;
  };

  return useQuery<FrameRequest.FrameByIdResBody | null>({
    queryKey: ["frame", "id", frameId],
    queryFn: getFrame,
    enabled: Boolean(frameId),
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: null,
  });
}

export function useUserFrames({ canvasId, userId }: UseUserFramesParams) {
  const getFrames = async (): Promise<FrameRequest.UserFramesResBody> => {
    if (!userId) return [];

    const response = await axios.get<FrameRequest.UserFramesResBody>(
      `${config.apiUrl}/api/v1/frame/user/${encodeURIComponent(userId)}/${encodeURIComponent(canvasId)}`,
    );
    return response.data;
  };

  return useQuery<FrameRequest.UserFramesResBody>({
    queryKey: ["frame", "user", canvasId, userId],
    queryFn: getFrames,
    enabled: Boolean(userId),
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: [],
  });
}

export function useGuildFrames({ canvasId, guildIds }: UseGuildFramesParams) {
  const getFrames = async (): Promise<FrameRequest.GuildFramesResBody> => {
    if (!guildIds || guildIds.length === 0) return [];

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

  return useQuery<FrameRequest.GuildFramesResBody>({
    queryKey: ["frame", "guild", canvasId, guildIds],
    queryFn: getFrames,
    enabled: Boolean(guildIds?.length),
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: [],
  });
}
