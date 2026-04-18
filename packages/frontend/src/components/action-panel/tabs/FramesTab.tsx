import { ValueOf } from "@blurple-canvas-web/types/src/utils";
import { styled } from "@mui/material";
import { useState } from "react";
import FrameEditPanel from "@/components/frames/FrameEditPanel";
import FrameInfoPanel from "@/components/frames/FrameInfoPanel";
import { TabBlock } from "./ActionPanelTabBody";

const FramesTabBlock = styled(TabBlock)`
  grid-template-rows: 1fr auto;
`;

export const FramePanelState = {
  Info: "info",
  Create: "create",
  Edit: "edit",
};

export type FramePanelState = ValueOf<typeof FramePanelState>;

interface FramesTabProps {
  active?: boolean;
}

export default function FramesTab({ active }: FramesTabProps) {
  const [activePanel, setActivePanel] = useState<FramePanelState>(
    FramePanelState.Info,
  );

  return (
    <FramesTabBlock active={active}>
      {activePanel === FramePanelState.Info ?
        <FrameInfoPanel setActivePanel={setActivePanel} />
      : (
        activePanel === FramePanelState.Edit ||
        activePanel === FramePanelState.Create
      ) ?
        <FrameEditPanel
          setActivePanel={setActivePanel}
          isCreateMode={activePanel === FramePanelState.Create}
        />
      : null}
    </FramesTabBlock>
  );
}
