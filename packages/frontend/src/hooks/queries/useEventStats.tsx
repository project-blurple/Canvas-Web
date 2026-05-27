"use client";

import type {
  BlurpleEvent,
  EventStatisticsSummary,
} from "@blurple-canvas-web/types";
import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import axios from "axios";
import config from "@/config/clientConfig";

export function useEventStats(
  eventId?: BlurpleEvent["id"],
  useQueryOptions?: Omit<
    UseQueryOptions<EventStatisticsSummary | null>,
    "queryKey" | "queryFn"
  >,
) {
  const getEventStats = async () => {
    if (!eventId) return null;

    const response = await axios.get<EventStatisticsSummary>(
      `${config.apiUrl}/api/v1/statistics/summary/event/${encodeURIComponent(eventId)}`,
    );
    return response.data;
  };

  return useQuery<EventStatisticsSummary | null>({
    queryKey: ["statistics/summary/event", eventId],
    queryFn: getEventStats,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    enabled: Boolean(eventId),
    ...useQueryOptions,
  });
}
