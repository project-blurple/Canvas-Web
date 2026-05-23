"use client";

import type { DiscordUserProfile } from "@blurple-canvas-web/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import config from "@/config/clientConfig";

interface UserDataResponse {
  guilds: DiscordUserProfile["guilds"];
}

const userDataQueryKey = (userId: string | undefined) =>
  ["discord/user-data", userId] as const;

async function getUserData(): Promise<UserDataResponse> {
  const response = await axios.get<UserDataResponse>(
    `${config.apiUrl}/api/v1/discord/guilds/permissions-map`,
    { withCredentials: true },
  );
  return response.data;
}

export function useUserData(user: DiscordUserProfile | null) {
  return useQuery({
    queryKey: userDataQueryKey(user?.id),
    queryFn: getUserData,
    enabled: Boolean(user && !user.guilds),
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

export function useRefreshGuildMemberships(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation<UserDataResponse>({
    mutationKey: ["discord/refresh-guilds", userId],
    mutationFn: async () => {
      const response = await axios.post<UserDataResponse>(
        `${config.apiUrl}/api/v1/discord/guilds/refresh`,
        undefined,
        { withCredentials: true },
      );
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(userDataQueryKey(userId), data);
    },
  });
}
