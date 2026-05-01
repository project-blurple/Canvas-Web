import { styled } from "@mui/material";
import { useEffect, useRef } from "react";
import { Heading } from "@/components/action-panel/ActionPanel";
import {
  ActionPanelTabBody,
  FullWidthScrollView,
  TabPanel,
} from "@/components/action-panel/tabs/ActionPanelTabBody";
import { useCanvasViewContext } from "@/contexts/CanvasViewContext";
import { useSelectedBoundsContext } from "@/contexts/SelectedBoundsContext";

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
          </div>
        </ActionPanelTabBody>
      </FullWidthScrollView>
    </ComplexSearchTabBlock>
  );
}
