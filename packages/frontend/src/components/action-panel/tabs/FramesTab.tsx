import { ValueOf } from "@blurple-canvas-web/types";
import { styled } from "@mui/material";
import { useEffect, useState } from "react";
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
  setTabsLocked: (locked: boolean) => void;
}

export default function FramesTab({ active, setTabsLocked }: FramesTabProps) {
  const [activePanel, setActivePanel] = useState<FramePanelState>(
    FramePanelState.Info,
  );

  useEffect(() => {
    setTabsLocked(activePanel !== FramePanelState.Info);
  }, [activePanel, setTabsLocked]);

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
