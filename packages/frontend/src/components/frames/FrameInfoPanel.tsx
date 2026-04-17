import { useState } from "react";
import {
  useAuthContext,
  useCanvasContext,
  useSelectedFrameContext,
} from "@/contexts";
import { createPixelUrl } from "@/util";
import {
  ActionPanelTabBody,
  ScrollBlock,
} from "../action-panel/tabs/ActionPanelTabBody";
import ActionPanelTooltip from "../action-panel/tabs/ActionPanelTooltip";
import BotCommandCard from "../action-panel/tabs/BotCommandCard";
import {
  FRAME_PANEL_STATE,
  FramePanelState,
} from "../action-panel/tabs/FramesTab";
import FrameInfoCard from "../action-panel/tabs/SelectedFrameInfoCard";
import { DynamicButton } from "../button";
import FrameList from "./FrameList";

export default function FrameInfoPanel({
  setActivePanel,
}: {
  setActivePanel: (panel: FramePanelState) => void;
}) {
  const { user } = useAuthContext();
  const { canvas } = useCanvasContext();
  const { frame: selectedFrame } = useSelectedFrameContext();

  const [tooltipIsOpen, setTooltipIsOpen] = useState(false);

  const frameUrl =
    selectedFrame ?
      createPixelUrl({
        canvasId: canvas.id,
        frameId: selectedFrame.id,
      })
    : "";

  return (
    <>
      <ScrollBlock>
        <FrameList />
      </ScrollBlock>
      {selectedFrame ?
        <ActionPanelTabBody>
          <FrameInfoCard frame={selectedFrame} />
          {selectedFrame.owner.type !== "system" && (
            <ActionPanelTooltip
              title="Copied"
              onClose={() => {
                setTooltipIsOpen(false);
              }}
              open={tooltipIsOpen}
            >
              <DynamicButton
                color={null}
                onAction={() => {
                  setTooltipIsOpen(true);
                  navigator.clipboard.writeText(frameUrl);
                }}
              >
                Copy frame link
              </DynamicButton>
            </ActionPanelTooltip>
          )}
        </ActionPanelTabBody>
      : user ?
        <ActionPanelTabBody>
          <BotCommandCard command="/frame create" />
          <DynamicButton
            color={null}
            onAction={() => {
              setActivePanel(FRAME_PANEL_STATE.Create);
            }}
          >
            Create frame
          </DynamicButton>
        </ActionPanelTabBody>
      : null}
    </>
  );
}
