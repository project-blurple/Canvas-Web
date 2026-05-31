import type { PixelHistoryRecord } from "@blurple-canvas-web/types";
import { styled } from "@mui/material";
import { useId, useState } from "react";
import { toast } from "sonner";
import { ButtonSupplement } from "@/components/button";
import Pagination from "@/components/Pagination";
import { useCanvasContext, useCanvasViewContext } from "@/contexts";
import {
  type PixelHistoryParams,
  usePixelHistory,
} from "@/hooks/queries/usePixelHistory";
import { createPixelUrl } from "@/util";
import ActionPanelPrimitives from "../primitives";
import {
  ActionPanelTabBody,
  FullWidthScrollView,
  TabPanel,
} from "./ActionPanelTabBody";
import { TooltipDynamicButton } from "./ActionPanelTooltip";
import CoordinatesCard from "./CoordinatesCard";
import PixelHistoryListItem from "./PixelHistoryListItem";

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
  page: number;
}

export function PixelHistoryPast({
  isLoading,
  history,
  page,
  pastId,
}: PixelHistoryProps & { pastId: string }) {
  const pastPixelHistory = history.slice(page === 1 ? 1 : 0); // [] if out of index

  if (isLoading || pastPixelHistory.length === 0) return;

  return (
    <>
      <ActionPanelPrimitives.SectionHeading>
        Paint history
      </ActionPanelPrimitives.SectionHeading>
      <HistoryList id={pastId}>
        {pastPixelHistory.map((history: PixelHistoryRecord) => (
          <PixelHistoryListItem key={history.id} record={history} />
        ))}
      </HistoryList>
    </>
  );
}

const PixelHistoryCurrent = ({
  isLoading,
  history,
  page,
  currentId,
}: PixelHistoryProps & { currentId: string }) => {
  if (isLoading) {
    return <PixelHistoryListItem />;
  }

  if (page > 1) return;

  if (history.length === 0) {
    return <p>No pixel history</p>;
  }

  const currentPixelInfo = history[0]; // undefined if out of index

  return <PixelHistoryListItem record={currentPixelInfo} id={currentId} />;
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
  const {
    adjustedCoords,
    containerRef,
    coords: point,
    zoom,
  } = useCanvasViewContext();
  const [page, setPage] = useState(1);
  const [historyParams, setHistoryParams] = useState<PixelHistoryParams | null>(
    point ? { point, page } : null,
  );
  const { data, isLoading } = usePixelHistory(canvasId, historyParams, {
    enabled: active,
  });

  if (
    point &&
    (historyParams?.point.x !== point.x || historyParams?.point.y !== point.y)
  ) {
    setHistoryParams({ point, page: 1 });
    setPage(1);
  }

  if (historyParams !== null && historyParams?.page !== page)
    setHistoryParams((prev) => (prev ? { ...prev, page } : null));

  const pixelHistory = data?.entries ?? [];
  const truePage = data?.page ?? 1;

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

  const currentId = useId();
  const pastId = useId();
  const listId = truePage > 1 ? pastId : `${currentId} ${pastId}`;

  return (
    <PixelInfoTabBlock active={active} {...props}>
      <ActionPanelTabBody>
        {adjustedCoords ?
          <div>
            <CoordinatesCard coordinates={adjustedCoords} />
            <PixelHistoryCurrent
              history={pixelHistory}
              isLoading={isLoading}
              page={truePage}
              currentId={currentId}
            />
          </div>
        : <p>No selected pixel</p>}
      </ActionPanelTabBody>
      {(truePage > 1 || pixelHistory.length > 1) && (
        <FullWidthScrollView>
          {pixelHistory.length > 0 && (
            <ActionPanelTabBody>
              <div>
                <PixelHistoryPast
                  history={pixelHistory}
                  isLoading={isLoading}
                  page={truePage}
                  pastId={pastId}
                />
              </div>
            </ActionPanelTabBody>
          )}
          <ActionPanelTabBody>
            <div>
              <Pagination
                aria-controls={listId}
                count={
                  data?.total ? Math.ceil(data.total / data.size) : truePage
                }
                onChange={(_, value) => setPage(value)}
                page={truePage}
                size="small"
                siblingCount={0}
              />
            </div>
          </ActionPanelTabBody>
        </FullWidthScrollView>
      )}
      <ActionPanelTabBody>
        {adjustedCoords && (
          <TooltipDynamicButton
            tooltipTitle="Copied"
            onAction={async () => {
              void (await navigator.clipboard.writeText(pixelUrl));
              toast.success("Pixel link copied to clipboard");
            }}
            color={pixelHistory?.[0]?.color.rgba ?? null}
          >
            Copy pixel link
            <ButtonSupplement>
              ({adjustedCoords.x},&nbsp;{adjustedCoords.y})
            </ButtonSupplement>
          </TooltipDynamicButton>
        )}
      </ActionPanelTabBody>
    </PixelInfoTabBlock>
  );
}
