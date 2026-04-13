"use client";

import { DiscordUserProfile } from "@blurple-canvas-web/types";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import config from "@/config";

interface UserDataResponse {
  guilds: DiscordUserProfile["guilds"];
}

export function useUserData(user: DiscordUserProfile | null) {
  const getUserData = async () => {
    const response = await axios.get<UserDataResponse>(
      `${config.apiUrl}/api/v1/discord/guilds/permissions-map`,
      { withCredentials: true },
    );
    return response.data;
  };

  return useQuery({
    queryKey: ["discord/user-data", user?.id],
    queryFn: getUserData,
    enabled: Boolean(user && !user.guilds),
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}
