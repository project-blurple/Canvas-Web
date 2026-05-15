import type { CanvasSummary } from "@blurple-canvas-web/types";
import { css, styled } from "@mui/material";
import { Grip, Users } from "lucide-react";
import { useCanvasImage, useCanvasStats } from "@/hooks";
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
`;

const EventCanvasName = styled("h3")`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const EventCanvasId = styled("code")`
  font-size: 0.875rem;
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
  active?: boolean;
}

export function CanvasPreviewCard({
  canvas,
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
        <EventCanvasName>{canvas.name}</EventCanvasName>
        <EventCanvasId>ID:{canvas.id}</EventCanvasId>
      </EventCanvasMeta>
      {canvasStats && (
        <EventCanvasStats>
          <EventCanvasStat>
            <Users size={16} />
            <span>{canvasStats.totalUsersInvolved.toLocaleString()}</span>
          </EventCanvasStat>
          <EventCanvasStat>
            <Grip size={16} />
            <span>{canvasStats.totalPixelsPlaced.toLocaleString()}</span>
          </EventCanvasStat>
        </EventCanvasStats>
      )}
    </EventCanvasCard>
  );
}
