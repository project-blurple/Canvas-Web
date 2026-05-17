import type { CanvasSummary } from "@blurple-canvas-web/types";
import { css, styled } from "@mui/material";
import { Grip, History, Radio, Users, X } from "lucide-react";
import { useCanvasImage, useCanvasStats } from "@/hooks";
import { dateToRelativeTime } from "@/util/text";
import CanvasAnimatedIcon from "../CanvasAnimatedIcon";

const EventCanvasCard = styled("button")`
  align-items: flex-start;
  background: ${({ theme }) => theme.palette.background.paper};
  border-radius: 0.75rem;
  border: transparent 1px solid;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  overflow: hidden;
  padding: 0.5rem;
  position: relative;
  transition: border-color var(--transition-duration-fast) ease;

  &:hover {
    border-color: oklch(from var(--discord-white) l c h / 20%);
  }
`;

const eventCanvasPreviewCss = css`
  aspect-ratio: 1;
  background: color-mix(in srgb, currentColor 6%, transparent);
  border-radius: 0.5rem;
  width: 100%;
`;

const EventCanvasPreview = styled("img")`
  ${eventCanvasPreviewCss}
  object-fit: cover;
`;

const EventCanvasPreviewPlaceholder = styled("div")`
  ${eventCanvasPreviewCss}
  align-items: center;
  display: flex;
  justify-content: center;
`;

const EventCanvasMeta = styled("div")`
  align-items: flex-start;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  min-width: 0;
  padding-inline: 0.125rem;
  width: 100%;
`;

const EventCanvasNameWrapper = styled("div")`
  align-items: center;
  display: flex;
  justify-content: space-between;
  width: 100%;
`;

const EventCanvasName = styled("h3")`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const EventCanvasCoords = styled("code")`
  display: flex;
  flex-direction: row;
  font-size: 0.875rem;
  gap: 0;
  opacity: 0.7;
`;

const EventCanvasStats = styled("div")`
  align-items: flex-start;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const EventCanvasStat = styled("div")`
  align-items: center;
  display: flex;
  gap: 0.25rem;
  font-size: 0.875rem;
  opacity: 0.75;
`;

interface CanvasPreviewCardProps extends React.ComponentPropsWithRef<
  typeof EventCanvasCard
> {
  canvas: CanvasSummary;
  currentEventId?: number;
  active?: boolean;
}

export function CanvasPreviewCard({
  canvas,
  currentEventId,
  active = true,
  ...props
}: CanvasPreviewCardProps) {
  const sourceImage = useCanvasImage(canvas.id);
  const { data: canvasStats } = useCanvasStats(canvas.id, {
    enabled: active,
  });

  return (
    <EventCanvasCard type="button" {...props}>
      {sourceImage ?
        <EventCanvasPreview alt={canvas.name} src={sourceImage.src} />
      : <EventCanvasPreviewPlaceholder>
          <CanvasAnimatedIcon
            style={{
              color: "var(--discord-blurple)",
              height: "24px",
              opacity: 0.5,
            }}
          />
        </EventCanvasPreviewPlaceholder>
      }
      <EventCanvasMeta>
        <EventCanvasNameWrapper>
          <EventCanvasName>{canvas.name}</EventCanvasName>
          {currentEventId === canvas.eventId && <Radio size={16} />}
        </EventCanvasNameWrapper>
        <EventCanvasCoords>
          {canvas.width}
          <X size={12} />
          {canvas.height}
        </EventCanvasCoords>
      </EventCanvasMeta>
      {canvasStats && (
        <EventCanvasStats>
          <EventCanvasStat
            title={`${canvasStats.totalUsersInvolved.toLocaleString()} total ${canvasStats.totalUsersInvolved === 1 ? "user" : "users"} involved`}
          >
            <Users size={16} />
            <span>{`${canvasStats.totalUsersInvolved.toLocaleString()} ${canvasStats.totalUsersInvolved === 1 ? "user" : "users"}`}</span>
          </EventCanvasStat>
          <EventCanvasStat
            title={`${canvasStats.totalPixelsPlaced.toLocaleString()} total ${canvasStats.totalPixelsPlaced === 1 ? "pixel" : "pixels"} placed`}
          >
            <Grip size={16} />
            <span>{`${canvasStats.totalPixelsPlaced.toLocaleString()} ${canvasStats.totalPixelsPlaced === 1 ? "pixel" : "pixels"}`}</span>
          </EventCanvasStat>
          <EventCanvasStat
            title={
              canvasStats.lastPlacedAt ?
                `Most recent pixel placed at ${new Date(
                  canvasStats.lastPlacedAt,
                ).toLocaleString(undefined, {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                })}`
              : "No history recorded"
            }
          >
            <History size={16} />
            <span>
              {canvasStats.lastPlacedAt ?
                dateToRelativeTime(new Date(canvasStats.lastPlacedAt))
              : "Never"}
            </span>
          </EventCanvasStat>
        </EventCanvasStats>
      )}
    </EventCanvasCard>
  );
}
