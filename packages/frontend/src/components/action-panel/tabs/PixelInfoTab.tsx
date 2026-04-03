import { PixelHistoryRecord } from "@blurple-canvas-web/types";
import { styled } from "@mui/material";

import { useCanvasContext } from "@/contexts";
import { usePixelHistory } from "@/hooks";
import { Heading } from "../ActionPanel";
import {
  ActionPanelTabBody,
  ScrollBlock,
  TabBlock,
} from "./ActionPanelTabBody";
import CoordinatesCard from "./CoordinatesCard";
import PixelHistoryListItem from "./PixelHistoryListItem";

const PixelInfoTabBlock = styled(TabBlock)`
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

interface PixelInfoTabProps {
  active?: boolean;
  canvasId: number;
}

export default function PixelInfoTab({
  active = false,
  canvasId,
}: PixelInfoTabProps) {
  const { coords, adjustedCoords } = useCanvasContext();
  const { data, isLoading } = usePixelHistory(canvasId, coords);

  const pixelHistory = data?.pixelHistory ?? [];

  return (
    <PixelInfoTabBlock active={active}>
      <ActionPanelTabBody>
        {adjustedCoords ? (
          <div>
            <CoordinatesCard coordinates={adjustedCoords} />
            <PixelHistoryCurrent history={pixelHistory} isLoading={isLoading} />
          </div>
        ) : (
          <p>No selected pixel</p>
        )}
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
    </PixelInfoTabBlock>
  );
}
