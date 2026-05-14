"use client";

import { styled } from "@mui/material";
import { TabPanel } from "@/components/action-panel/tabs/ActionPanelTabBody";
import { useCanvasList, useEventInfo } from "@/hooks";

const AdminEventTabBlock = styled(TabPanel)`
  grid-template-rows: auto 1fr;
`;

const EventInfoWrapper = styled("div")`
  display: flex;
  flex-direction: column;
  gap: 1rem;
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
  const { data: currentEvent, isLoading: currentEventIsLoading } =
    useEventInfo();
  const { data: canvases = [], isLoading: canvasListIsLoading } =
    useCanvasList();

  const isLoading = currentEventIsLoading || canvasListIsLoading;

  const eventCanvases = canvases.filter(
    (canvas) => canvas.eventId === currentEvent?.id,
  );

  return (
    <AdminEventTabBlock active={active} {...props}>
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
    </AdminEventTabBlock>
  );
}
