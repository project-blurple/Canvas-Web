import type { PixelHistoryWrapper } from "@blurple-canvas-web/types";
import { styled } from "@mui/material";
import { useEffect, useState } from "react";
import { Heading } from "@/components/action-panel/ActionPanel";
import {
  ActionPanelTabBody,
  FullWidthScrollView,
  TabPanel,
} from "@/components/action-panel/tabs/ActionPanelTabBody";
import { PixelHistoryPast } from "@/components/action-panel/tabs/PixelInfoTab";
import { DynamicButton } from "@/components/button";
import { useCanvasContext } from "@/contexts";
import { useCanvasViewContext } from "@/contexts/CanvasViewContext";
import { useSelectedBoundsContext } from "@/contexts/SelectedBoundsContext";
import {
  type ComplexPixelHistoryQuery,
  useComplexPixelHistory,
} from "@/hooks/queries/usePixelHistory";

const ComplexSearchTabBlock = styled(TabPanel)`
  grid-template-rows: 1fr auto;
`;

const SearchWrapper = styled("div")`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

interface ComplexSearchTabProps extends React.ComponentPropsWithoutRef<
  typeof ComplexSearchTabBlock
> {}

export default function ComplexSearchTab({ ...props }: ComplexSearchTabProps) {
  const {
    setCanEdit,
    selectedBounds,
    // setSelectedBounds,
    setMinimumBounds,
    setBoundsToCurrentView,
    setShowSelectedBounds,
  } = useSelectedBoundsContext();
  const { containerRef } = useCanvasViewContext();
  const { canvas } = useCanvasContext();

  const [searchQuery, setSearchQuery] =
    useState<ComplexPixelHistoryQuery | null>(null);
  const [historyData, setHistoryData] = useState<PixelHistoryWrapper | null>(
    null,
  );
  const historyQuery = useComplexPixelHistory(canvas.id, searchQuery);

  useEffect(
    function initialiseBoundsFromCurrentView() {
      if (!props.active) return;
      if (!containerRef.current) return;

      if (selectedBounds) {
        setCanEdit(true);
        setShowSelectedBounds(true);
        return;
      }

      setBoundsToCurrentView(0.75);
      setMinimumBounds(1, 1);
      setCanEdit(true);
      setShowSelectedBounds(true);
    },
    [
      props.active,
      containerRef,
      selectedBounds,
      setBoundsToCurrentView,
      setMinimumBounds,
      setCanEdit,
      setShowSelectedBounds,
    ],
  );

  useEffect(
    function updateHistoryFromQuery() {
      if (!historyQuery.data) return;

      setHistoryData(historyQuery.data);
    },
    [historyQuery.data],
  );

  function handleSearchClick() {
    if (!selectedBounds) return;

    setSearchQuery({
      point0: {
        x: selectedBounds.left,
        y: selectedBounds.top,
      },
      point1: {
        x: selectedBounds.right,
        y: selectedBounds.bottom,
      },
    });
  }

  return (
    <ComplexSearchTabBlock {...props}>
      <FullWidthScrollView>
        <ActionPanelTabBody>
          <SearchWrapper>
            <Heading>History Search</Heading>
            <span>
              {selectedBounds?.top},{selectedBounds?.left} -{" "}
              {selectedBounds?.bottom},{selectedBounds?.right}
            </span>
            <DynamicButton
              onClick={handleSearchClick}
              disabled={!selectedBounds || historyQuery.isLoading}
            >
              {!historyQuery.isLoading ? "Search" : "Loading..."}
            </DynamicButton>
            <PixelHistoryPast
              history={historyData?.pixelHistory ?? []}
              isLoading={historyQuery.isLoading}
            />
          </SearchWrapper>
        </ActionPanelTabBody>
      </FullWidthScrollView>
    </ComplexSearchTabBlock>
  );
}
