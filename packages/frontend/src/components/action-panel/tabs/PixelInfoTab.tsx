import { PixelHistoryRecord } from "@blurple-canvas-web/types";
import { styled } from "@mui/material";
import { useState } from "react";
import { DynamicButton } from "@/components/button";
import { useCanvasContext, useCanvasViewContext } from "@/contexts";
import { usePixelHistory } from "@/hooks";
import { createPixelUrl } from "@/util";
import { Heading } from "../ActionPanel";
import {
  ActionPanelTabBody,
  ScrollBlock,
  TabPanel,
} from "./ActionPanelTabBody";
import ActionPanelTooltip from "./ActionPanelTooltip";
import CoordinatesCard from "./CoordinatesCard";
import PixelHistoryListItem from "./PixelHistoryListItem";
import { CoordinateLabel } from "./PlacePixelTab";

const PixelInfoTabBlock = styled(TabPanel)`
  grid-template-rows: auto 1fr;
`;

const HistoryList = styled("div")`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

interface PixelHistoryProps {
  isLoading: boolean;
  history: PixelHistoryRecord[];
}

const PixelHistoryPast = ({ isLoading, history }: PixelHistoryProps) => {
  if (isLoading && history.length === 0) {
    return;
  }
  const pastPixelHistory = history.slice(1); // [] if out of index

  return (
    <>
      {pastPixelHistory.length !== 0 && (
        <>
          <Heading>Paint history</Heading>
          <HistoryList>
            {pastPixelHistory.map((history: PixelHistoryRecord) => (
              <PixelHistoryListItem key={history.id} record={history} />
            ))}
          </HistoryList>
        </>
      )}
    </>
  );
};

const PixelHistoryCurrent = ({ isLoading, history }: PixelHistoryProps) => {
  if (isLoading) {
    return <PixelHistoryListItem />;
  }

  if (history.length === 0) {
    return <p>No pixel history</p>;
  }

  const currentPixelInfo = history[0]; // undefined if out of index

  return <PixelHistoryListItem record={currentPixelInfo} />;
};

interface PixelInfoTabProps extends React.ComponentPropsWithRef<
  typeof PixelInfoTabBlock
> {
  active?: boolean;
  canvasId: number;
}

export default function PixelInfoTab({
  active = false,
  canvasId,
  ...props
}: PixelInfoTabProps) {
  const { canvas } = useCanvasContext();
  const { adjustedCoords, containerRef, coords, zoom } = useCanvasViewContext();
  const { data, isLoading } = usePixelHistory(canvasId, coords);

  const pixelHistory = data?.pixelHistory ?? [];

  const [tooltipIsOpen, setTooltipIsOpen] = useState(false);
  const closeTooltip = () => setTooltipIsOpen(false);
  const openTooltip = () => setTooltipIsOpen(true);

  const pixelUrl =
    (adjustedCoords &&
      containerRef.current &&
      createPixelUrl({
        canvasId: canvasId,
        coords: adjustedCoords,
        pixelWidth: Math.min(
          containerRef.current?.clientWidth / zoom,
          canvas.width,
        ),
        pixelHeight: Math.min(
          containerRef.current?.clientHeight / zoom,
          canvas.height,
        ),
      })) ??
    "";

  return (
    <PixelInfoTabBlock active={active} {...props}>
      <ActionPanelTabBody>
        {adjustedCoords ?
          <div>
            <CoordinatesCard coordinates={adjustedCoords} />
            <PixelHistoryCurrent history={pixelHistory} isLoading={isLoading} />
          </div>
        : <p>No selected pixel</p>}
      </ActionPanelTabBody>
      {adjustedCoords && pixelHistory.length > 1 && (
        <ScrollBlock>
          <ActionPanelTabBody>
            <div>
              <PixelHistoryPast history={pixelHistory} isLoading={isLoading} />
            </div>
          </ActionPanelTabBody>
        </ScrollBlock>
      )}
      <ActionPanelTabBody>
        {adjustedCoords && (
          <ActionPanelTooltip
            title="Copied"
            onClose={closeTooltip}
            open={tooltipIsOpen}
          >
            <DynamicButton
              color={pixelHistory?.[0]?.color ?? null}
              onAction={() => {
                openTooltip();
                navigator.clipboard.writeText(pixelUrl);
              }}
            >
              Copy pixel link
              <CoordinateLabel>
                ({adjustedCoords.x},&nbsp;{adjustedCoords.y})
              </CoordinateLabel>
            </DynamicButton>
          </ActionPanelTooltip>
        )}
      </ActionPanelTabBody>
    </PixelInfoTabBlock>
  );
}
