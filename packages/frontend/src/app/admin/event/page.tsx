"use client";

import { styled } from "@mui/material";
import { useCanvasList, useEventInfo } from "@/hooks";
import Admin from "../Admin";

const EventInfoWrapper = styled("div")`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

export default function AdminEventPage() {
  const { data: currentEvent, isLoading: currentEventIsLoading } =
    useEventInfo();
  const { data: canvases = [], isLoading: canvasListIsLoading } =
    useCanvasList();

  const isLoading = currentEventIsLoading || canvasListIsLoading;

  const eventCanvases = canvases.filter(
    (canvas) => canvas.eventId === currentEvent?.id,
  );

  return (
    <Admin>
      <EventInfoWrapper>
        {isLoading ?
          "Loading..."
        : !currentEvent ?
          <h2>Event not found</h2>
        : <>
            <h2>{currentEvent.name}</h2>
            <ul>
              {/* This would be cool as previews/thumbnails */}
              {eventCanvases.map((canvas) => (
                <li key={canvas.id}>
                  {canvas.name} (#{canvas.id})
                </li>
              ))}
            </ul>
          </>
        }
      </EventInfoWrapper>
    </Admin>
  );
}
