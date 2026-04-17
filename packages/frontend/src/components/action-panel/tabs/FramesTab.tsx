import { styled } from "@mui/material";
import { useState } from "react";
import { DynamicButton } from "@/components/button";
import FrameList from "@/components/frames/FrameList";
import { useSelectedFrameContext } from "@/contexts";
import { createPixelUrl } from "@/util";
import {
  ActionPanelTabBody,
  ScrollBlock,
  TabBlock,
} from "./ActionPanelTabBody";
import ActionPanelTooltip from "./ActionPanelTooltip";
import BotCommandCard from "./BotCommandCard";
import FrameInfoCard from "./SelectedFrameInfoCard";

const FramesTabBlock = styled(TabBlock)`
  grid-template-rows: 1fr auto;
`;

interface FramesTabProps {
  active?: boolean;
  canvasId: number;
}

export default function FramesTab({ active, canvasId }: FramesTabProps) {
  const { frame: selectedFrame } = useSelectedFrameContext();

  const [tooltipIsOpen, setTooltipIsOpen] = useState(false);
  const closeTooltip = () => setTooltipIsOpen(false);
  const openTooltip = () => setTooltipIsOpen(true);

  const frameUrl =
    selectedFrame ?
      createPixelUrl({
        canvasId: canvasId,
        frameId: selectedFrame.id,
      })
    : "";

  return (
    <FramesTabBlock active={active}>
      <ScrollBlock>
        <FrameList />
      </ScrollBlock>
      {selectedFrame && (
        <ActionPanelTabBody>
          <FrameInfoCard frame={selectedFrame} />
          <BotCommandCard command="/frame create" />
          {selectedFrame.owner.type !== "system" && (
            <ActionPanelTooltip
              title="Copied"
              onClose={closeTooltip}
              open={tooltipIsOpen}
            >
              <DynamicButton
                color={null}
                onAction={() => {
                  openTooltip();
                  navigator.clipboard.writeText(frameUrl);
                }}
              >
                Copy frame link
              </DynamicButton>
            </ActionPanelTooltip>
          )}
        </ActionPanelTabBody>
      )}
    </FramesTabBlock>
  );
}
