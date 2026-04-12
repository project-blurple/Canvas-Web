import { Frame } from "@blurple-canvas-web/types";
import { styled } from "@mui/material/styles";
import { FrameThumbCard } from "./FrameThumbCard";

const FrameList = styled("ul")`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  list-style: none;
  margin: 0;
  padding: 0;

  ${({ theme }) => theme.breakpoints.down("md")} {
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const FrameListItem = styled("li")`
  list-style: none;
`;

const FrameButton = styled("button")`
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  text-align: inherit;
  width: 100%;
`;

interface FramePreviewListProps {
  items: Frame[];
  sourceImage: CanvasImageSource | null;
  onSelectFrame: (frame: Frame) => void;
}

export function FramePreviewList({
  items,
  sourceImage,
  onSelectFrame,
}: FramePreviewListProps) {
  return (
    <FrameList>
      {items.map((frame) => (
        <FrameListItem key={frame.id}>
          <FrameButton type="button" onClick={() => onSelectFrame(frame)}>
            <FrameThumbCard frame={frame} sourceImage={sourceImage} />
          </FrameButton>
        </FrameListItem>
      ))}
    </FrameList>
  );
}
