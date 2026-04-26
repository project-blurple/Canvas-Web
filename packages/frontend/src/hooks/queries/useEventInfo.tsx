"use client";

import { BlurpleEvent, EventRequest } from "@blurple-canvas-web/types";
import { useQuery } from "@tanstack/react-query";
import { useApiContext } from "@/contexts";

export function useEventInfo(eventId?: BlurpleEvent["id"]) {
  const api = useApiContext();
  const getEvent = async () => {
    return await api.get<EventRequest.ResBody>(
      `event/${eventId ? encodeURIComponent(eventId) : "current"}`,
    );
  };

  return useQuery({
    queryKey: ["event", eventId],
    queryFn: getEvent,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}
