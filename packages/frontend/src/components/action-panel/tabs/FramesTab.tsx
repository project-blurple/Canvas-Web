import { ValueOf } from "@blurple-canvas-web/types";
import { styled } from "@mui/material";
import { ReactNode, useEffect, useState } from "react";
import FrameEditPanel from "@/components/frames/FrameEditPanel";
import FrameInfoPanel from "@/components/frames/FrameInfoPanel";
import { TabView } from "./ActionPanelTabBody";

const FramesTabBlock = styled(TabView)`
  grid-template-rows: 1fr auto;
`;

export const FramePanelMode = {
  Info: "info",
  Create: "create",
  Edit: "edit",
} as const;

export type FramePanelMode = ValueOf<typeof FramePanelMode>;

interface FramesTabProps {
  active?: boolean;
  setTabsLocked: (locked: boolean) => void;
}

export default function FramesTab({ active, setTabsLocked }: FramesTabProps) {
  const [activePanel, setActivePanel] = useState<FramePanelMode>(
    FramePanelMode.Info,
  );

  const panelByMode = {
    [FramePanelMode.Info]: <FrameInfoPanel setActivePanel={setActivePanel} />,
    [FramePanelMode.Edit]: (
      <FrameEditPanel setActivePanel={setActivePanel} isCreateMode={false} />
    ),
    [FramePanelMode.Create]: (
      <FrameEditPanel setActivePanel={setActivePanel} isCreateMode />
    ),
  } as const satisfies Record<FramePanelMode, ReactNode>;

  useEffect(() => {
    setTabsLocked(activePanel !== FramePanelMode.Info);
  }, [activePanel, setTabsLocked]);

  return (
    <FramesTabBlock active={active}>{panelByMode[activePanel]}</FramesTabBlock>
  );
}
