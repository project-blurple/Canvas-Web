import { ValueOf } from "@blurple-canvas-web/types/src/utils";
import { styled } from "@mui/material";
import { useState } from "react";
import FrameInfoPanel from "@/components/frames/FrameInfoPanel";
import { TabBlock } from "./ActionPanelTabBody";

const FramesTabBlock = styled(TabBlock)`
  grid-template-rows: 1fr auto;
`;

export const FRAME_PANEL_STATE = {
  Info: "info",
  Create: "create",
};

export type FramePanelState = ValueOf<typeof FRAME_PANEL_STATE>;

interface FramesTabProps {
  active?: boolean;
}

export default function FramesTab({ active }: FramesTabProps) {
  const [activePanel, setActivePanel] = useState<FramePanelState>(
    FRAME_PANEL_STATE.Info,
  );

  return (
    <FramesTabBlock active={active}>
      {activePanel === FRAME_PANEL_STATE.Info ?
        <FrameInfoPanel setActivePanel={setActivePanel} />
      : activePanel === FRAME_PANEL_STATE.Create ?
        <div>Create frame panel</div>
      : null}
    </FramesTabBlock>
  );
}
