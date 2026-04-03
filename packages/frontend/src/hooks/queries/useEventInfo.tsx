"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";

import config from "@/config";
import { BlurpleEvent, EventRequest } from "@blurple-canvas-web/types";

export function useEventInfo(eventId?: BlurpleEvent["id"]) {
  const getEvent = async () => {
    const response = await axios.get<EventRequest.ResBody>(
      `${config.apiUrl}/api/v1/event/${encodeURIComponent(eventId) ?? "current"}`,
    );
    return response.data;
  };

  return useQuery({
    queryKey: ["event", eventId],
    queryFn: getEvent,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}
