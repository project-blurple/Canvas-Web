import type { CanvasSummary } from "@blurple-canvas-web/types";
import { css, styled } from "@mui/material";
import { useCanvasImage } from "@/hooks";
import CanvasAnimatedIcon from "../CanvasAnimatedIcon";

const EventCanvasCard = styled("li")`
  border: 1px solid color-mix(in srgb, currentColor 15%, transparent);
  border-radius: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  overflow: hidden;
  padding: 0.5rem;
  position: relative;
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
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  min-width: 0;
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

export function CanvasPreviewCard({ canvas }: { canvas: CanvasSummary }) {
  const sourceImage = useCanvasImage(canvas.id);

  return (
    <EventCanvasCard>
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
        <EventCanvasId>ID: {canvas.id}</EventCanvasId>
      </EventCanvasMeta>
    </EventCanvasCard>
  );
}
