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

export function useFrame({
  frameId,
  canvasId,
  userId,
  guildIds,
}: {
  frameId?: Frame["id"];
  canvasId?: Frame["canvasId"];
  userId?: DiscordUserProfile["id"];
  guildIds?: DiscordGuildRecord["guild_id"][];
}) {
  const getFrame = async (): Promise<Frame[]> => {
    if (frameId) {
      if (canvasId || userId || guildIds) {
        throw new Error(
          "Cannot specify multiple query parameters with frameId",
        );
      }

      const response = await axios.get<FrameRequest.ResBody>(
        `${config.apiUrl}/api/v1/frame/${encodeURIComponent(frameId)}`,
      );
      return response.data;
    }

    if (!canvasId) {
      throw new Error(
        "Must specify canvasId when querying by userId or guildIds",
      );
    }

    if ((userId && guildIds) || (!userId && !guildIds)) {
      return [];
    }

    if (userId) {
      const response = await axios.get<FrameRequest.ResBody>(
        `${config.apiUrl}/api/v1/frame/user/${userId}/${canvasId}`,
      );
      return response.data;
    }

    if (guildIds) {
      const response = await axios.get<FrameRequest.ResBody>(
        `${config.apiUrl}/api/v1/frame/guilds/${canvasId}`,
        {
          params: {
            guildIds: guildIds,
          },
          paramsSerializer: {
            indexes: null,
          },
        },
      );
      return response.data;
    }

    return [];
  };

  return useQuery<FrameRequest.ResBody>({
    queryKey: ["frame", frameId, canvasId, userId, guildIds],
    queryFn: getFrame,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: [] as FrameRequest.ResBody,
  });
}
