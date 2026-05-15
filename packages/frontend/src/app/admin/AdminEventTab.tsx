"use client";

import { styled } from "@mui/material";
import { CalendarRange, Radio } from "lucide-react";
import { TabPanel } from "@/components/action-panel/tabs/ActionPanelTabBody";
import { useCanvasContext } from "@/contexts/CanvasContext";
import { useCanvasList, useEventInfo } from "@/hooks";

const AdminEventTabBlock = styled(TabPanel)`
  grid-template-rows: auto 1fr;
`;

const EventInfoWrapper = styled("div")`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
`;

const EventInfoHeader = styled("h1")`
  align-items: center;
  display: flex;
  font-size: 1.5rem;
  font-weight: 600;
  gap: 0.5rem;
`;

const EventLiveIndicator = styled("div")`
  align-items: center;
  display: flex;
  font-size: 0.875rem;
  gap: 0.25rem;
  opacity: 0.75;
`;

interface AdminEventTabProps extends React.ComponentPropsWithRef<
  typeof AdminEventTabBlock
> {
  active: boolean;
}

export default function AdminEventTab({
  active,
  ...props
}: AdminEventTabProps) {
  const { canvas } = useCanvasContext();
  const { data: selectedEvent, isLoading: currentEventIsLoading } =
    useEventInfo(canvas.eventId ?? undefined);
  const { data: canvases = [], isLoading: canvasListIsLoading } =
    useCanvasList();

  const isLoading = currentEventIsLoading || canvasListIsLoading;

  const eventCanvases = canvases.filter(
    (canvas) => canvas.eventId === selectedEvent?.id,
  );

  return (
    <AdminEventTabBlock active={active} {...props}>
      <EventInfoWrapper>
        {isLoading ?
          "Loading..."
        : !selectedEvent ?
          <h2>Event not found</h2>
        : <>
            <EventInfoHeader>
              <CalendarRange />
              {selectedEvent.name}
            </EventInfoHeader>
            {selectedEvent.isCurrentEvent && (
              <EventLiveIndicator>
                <Radio size={16} />
                This event is currently live!
              </EventLiveIndicator>
            )}
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
    </AdminEventTabBlock>
  );
}
