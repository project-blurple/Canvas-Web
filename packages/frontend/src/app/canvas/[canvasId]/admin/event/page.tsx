"use client";

import { styled } from "@mui/material";
import { CalendarRange, Radio } from "lucide-react";
import { useRouter } from "next/navigation";
import CanvasIcon from "@/components/CanvasIcon";
import { CanvasPreviewCard } from "@/components/canvas/CanvasPreviewCard";
import { useCanvasContext } from "@/contexts/CanvasContext";
import { useCanvasList } from "@/hooks/queries/useCanvasList";
import { useEventInfo } from "@/hooks/queries/useEventInfo";
import { useEventStats } from "@/hooks/queries/useEventStats";
import { usePalette } from "@/hooks/queries/usePalette";
import AdminDashboard from "../AdminDashboard";

const AdminEventTabBlock = styled("section")`
  display: grid;
  gap: 1rem;
  grid-template-rows: auto 1fr;
  max-width: 80rem;
  width: 100%;
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

const EventStatWrapper = styled("div")`
  display: grid;
  gap: 0.5rem;
  grid-template-columns: repeat(3, minmax(100px, 1fr));
`;

const EventStatCard = styled("div")`
  align-items: flex-start;
  background: ${({ theme }) => theme.palette.background.paper};
  border-radius: 0.5rem;
  display: flex;
  flex-direction: column;
  font-size: 0.875rem;
  gap: 0.25rem;
  padding: 1rem;
`;

const EventStatCardValue = styled("p")`
  font-size: 1.25rem;
  font-stretch: 125%;
  font-weight: 600;
`;

const EventCanvasList = styled("div")`
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(auto-fill, 10rem);
`;

function AdminEventTab() {
  const router = useRouter();
  const { canvas } = useCanvasContext();
  const { data: selectedEvent, isLoading: currentEventIsLoading } =
    useEventInfo(canvas.eventId ?? undefined);
  const { data: canvases = [], isLoading: canvasListIsLoading } =
    useCanvasList();
  const { data: eventStats, isLoading: eventStatsIsLoading } = useEventStats(
    selectedEvent?.id,
  );
  const { data: palette = [], isLoading: paletteIsLoading } = usePalette(
    selectedEvent?.id,
    true,
  );

  const isLoading =
    currentEventIsLoading ||
    canvasListIsLoading ||
    paletteIsLoading ||
    eventStatsIsLoading;

  const participatingGuildCount = palette.filter(
    (color) => !color.global && color.guildId,
  ).length;

  const eventCanvases = canvases.filter(
    (canvasItem) => canvasItem.eventId === selectedEvent?.id,
  );

  return (
    <AdminEventTabBlock>
      <EventInfoWrapper>
        {isLoading ?
          <CanvasIcon
            loading
            size={64}
            style={{
              color: "var(--discord-blurple)",
              margin: "auto",
              opacity: 0.55,
            }}
          />
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
            <EventStatWrapper>
              <EventStatCard>
                <span>Guilds</span>
                <EventStatCardValue>
                  {participatingGuildCount.toLocaleString()}
                </EventStatCardValue>
              </EventStatCard>
              {eventStats && (
                <>
                  <EventStatCard>
                    <span>Users</span>
                    <EventStatCardValue>
                      {eventStats.totalUsersInvolved.toLocaleString()}
                    </EventStatCardValue>
                  </EventStatCard>
                  <EventStatCard>
                    <span>Pixels placed</span>
                    <EventStatCardValue>
                      {eventStats.totalPixelsPlaced.toLocaleString()}
                    </EventStatCardValue>
                  </EventStatCard>
                </>
              )}
            </EventStatWrapper>
            <EventCanvasList>
              {eventCanvases.map((canvasItem) => (
                <CanvasPreviewCard
                  key={canvasItem.id}
                  canvas={canvasItem}
                  onClick={() =>
                    router.push(`/canvas/${encodeURIComponent(canvasItem.id)}`)
                  }
                />
              ))}
            </EventCanvasList>
          </>
        }
      </EventInfoWrapper>
    </AdminEventTabBlock>
  );
}

export default function EventAdminPage() {
  return (
    <AdminDashboard>
      <AdminEventTab />
    </AdminDashboard>
  );
}
