import type { PixelHistoryRecord } from "@blurple-canvas-web/types";
import { Pagination, PaginationItem, styled } from "@mui/material";
import {
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useId, useState } from "react";
import { ButtonSupplement } from "@/components/button";
import { useCanvasContext, useCanvasViewContext } from "@/contexts";
import { usePixelHistory } from "@/hooks";
import type { PixelHistoryQuery } from "@/hooks/queries/usePixelHistory";
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

const StyledPaginationItem = styled(PaginationItem)`
  font-variant-numeric: tabular-nums;
`;

const customIconSlots = {
  first: ChevronFirst,
  previous: ChevronLeft,
  next: ChevronRight,
  last: ChevronLast,
};

interface PixelHistoryProps {
  isLoading: boolean;
  history: PixelHistoryRecord[];
  page: number;
  currentId: string;
  pastId: string;
}

export function PixelHistoryPast({
  isLoading,
  history,
  page,
  pastId,
}: PixelHistoryProps) {
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
}: PixelHistoryProps) => {
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
  const [historyQuery, setHistoryQuery] = useState<PixelHistoryQuery | null>(
    point ? { point, page } : null,
  );
  const { data, isLoading } = usePixelHistory(canvasId, historyQuery, {
    enabled: active,
  });

  if (
    point &&
    (historyQuery?.point.x !== point.x || historyQuery?.point.y !== point.y)
  ) {
    setHistoryQuery({ point, page: 1 });
    setPage(1);
  }

  if (historyQuery !== null && historyQuery?.page !== page)
    setHistoryQuery((prev) => (prev ? { ...prev, page } : null));

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
              pastId={pastId}
            />
          </div>
        : <p>No selected pixel</p>}
      </ActionPanelTabBody>
      {adjustedCoords && pixelHistory.length > 1 && (
        <FullWidthScrollView>
          <ActionPanelTabBody>
            <div>
              <PixelHistoryPast
                history={pixelHistory}
                isLoading={isLoading}
                page={truePage}
                currentId={currentId}
                pastId={pastId}
              />
            </div>
          </ActionPanelTabBody>
        </FullWidthScrollView>
      )}
      {(truePage > 1 || pixelHistory.length > 1) && (
        <ActionPanelTabBody>
          <Pagination
            aria-controls={listId}
            color="primary"
            count={data?.total ? Math.ceil(data.total / data.size) : truePage}
            onChange={(_, value) => setPage(value)}
            page={truePage}
            renderItem={(item) => (
              <StyledPaginationItem slots={customIconSlots} {...item} />
            )}
            sx={{
              "& .MuiPagination-ul": {
                justifyContent: "center",
              },
            }}
            shape="rounded"
            size="small"
            showFirstButton
            showLastButton
            siblingCount={0}
          />
        </ActionPanelTabBody>
      )}
      <ActionPanelTabBody>
        {adjustedCoords && (
          <TooltipDynamicButton
            tooltipTitle="Copied"
            onAction={() => {
              navigator.clipboard.writeText(pixelUrl);
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
