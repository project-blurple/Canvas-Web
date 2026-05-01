import type { CanvasInfo } from "@blurple-canvas-web/types";
import { styled } from "@mui/material";
import { useEffect, useState } from "react";
import { Heading } from "@/components/action-panel/ActionPanel";
import {
  ActionPanelTabBody,
  FullWidthScrollView,
  TabPanel,
} from "@/components/action-panel/tabs/ActionPanelTabBody";
import { PixelHistoryPast } from "@/components/action-panel/tabs/PixelInfoTab";
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

  const [debouncedQuery, setDebouncedQuery] =
    useState<ComplexPixelHistoryQuery | null>(null);

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
    function debounceBoundsChange() {
      if (!props.active) return;
      if (!selectedBounds) {
        setDebouncedQuery(null);
        return;
      }

      const timeoutId = window.setTimeout(() => {
        setDebouncedQuery({
          point0: {
            x: selectedBounds.left,
            y: selectedBounds.top,
          },
          point1: {
            x: selectedBounds.right,
            y: selectedBounds.bottom,
          },
        });
      }, 500);

      return () => window.clearTimeout(timeoutId);
    },
    [props.active, selectedBounds],
  );

  const { data: history, isLoading: historyIsLoading } = useComplexPixelHistory(
    canvas.id,
    debouncedQuery,
  );

  console.log(debouncedQuery, history, historyIsLoading, debouncedQuery);

  return (
    <ComplexSearchTabBlock {...props}>
      <FullWidthScrollView>
        <ActionPanelTabBody>
          <div>
            <Heading>History Search</Heading>
            <span>
              {selectedBounds?.top},{selectedBounds?.left} -{" "}
              {selectedBounds?.bottom},{selectedBounds?.right}
            </span>
            <PixelHistoryPast
              history={history?.pixelHistory ?? []}
              isLoading={historyIsLoading}
            />
          </div>
        </ActionPanelTabBody>
      </FullWidthScrollView>
    </ComplexSearchTabBlock>
  );
}
