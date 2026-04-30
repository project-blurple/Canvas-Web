"use client";

import type { BlurpleEvent, EventRequest } from "@blurple-canvas-web/types";
import { useQuery } from "@tanstack/react-query";
import { useApiContext } from "@/contexts";

export function useEventInfo(
  eventId: BlurpleEvent["id"] | "current" = "current",
) {
  const api = useApiContext();
  const getEvent = async () => {
    return await api
      .get<EventRequest.ResBody>(`event/${encodeURIComponent(eventId)}`)
      .json();
  };

  return useQuery({
    queryKey: ["event", eventId],
    queryFn: getEvent,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}
