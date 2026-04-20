import { ValueOf } from "@blurple-canvas-web/types";
import { styled } from "@mui/material";
import { useEffect, useState } from "react";
import FrameEditPanel from "@/components/frames/FrameEditPanel";
import FrameInfoPanel from "@/components/frames/FrameInfoPanel";
import { TabBlock } from "./ActionPanelTabBody";

const FramesTabBlock = styled(TabBlock)`
  grid-template-rows: 1fr auto;
`;

export const FramePanelMode = {
  Info: "info",
  Create: "create",
  Edit: "edit",
};

export type FramePanelMode = ValueOf<typeof FramePanelMode>;

interface FramesTabProps {
  active?: boolean;
  setTabsLocked: (locked: boolean) => void;
}

export default function FramesTab({ active, setTabsLocked }: FramesTabProps) {
  const [activePanel, setActivePanel] = useState<FramePanelMode>(
    FramePanelMode.Info,
  );

  useEffect(() => {
    setTabsLocked(activePanel !== FramePanelMode.Info);
  }, [activePanel, setTabsLocked]);

  return (
    <FramesTabBlock active={active}>
      {activePanel === FramePanelMode.Info ?
        <FrameInfoPanel setActivePanel={setActivePanel} />
      : (
        activePanel === FramePanelMode.Edit ||
        activePanel === FramePanelMode.Create
      ) ?
        <FrameEditPanel
          setActivePanel={setActivePanel}
          isCreateMode={activePanel === FramePanelMode.Create}
        />
      : null}
    </FramesTabBlock>
  );
}
