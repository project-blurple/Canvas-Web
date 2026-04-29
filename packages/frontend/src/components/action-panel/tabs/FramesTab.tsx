import type { ValueOf } from "@blurple-canvas-web/types";
import { styled } from "@mui/material";
import { type ReactNode, useState } from "react";
import FrameEditPanel from "@/components/frames/FrameEditPanel";
import FrameInfoPanel from "@/components/frames/FrameInfoPanel";
import { TabPanel } from "./ActionPanelTabBody";

const FramesTabBlock = styled(TabPanel)`
  grid-template-rows: 1fr auto;
`;

export const FramePanelMode = {
  Info: "info",
  Create: "create",
  Edit: "edit",
} as const;

export type FramePanelMode = ValueOf<typeof FramePanelMode>;

interface FramesTabProps extends React.ComponentPropsWithRef<
  typeof FramesTabBlock
> {
  setTabsLocked: (locked: boolean) => void;
}

export default function FramesTab({ setTabsLocked, ...props }: FramesTabProps) {
  const [activePanel, setActivePanel] = useState<FramePanelMode>(
    FramePanelMode.Info,
  );

  setTabsLocked(activePanel !== FramePanelMode.Info);

  const panelByMode = {
    [FramePanelMode.Info]: <FrameInfoPanel setActivePanel={setActivePanel} />,
    [FramePanelMode.Edit]: (
      <FrameEditPanel setActivePanel={setActivePanel} isCreateMode={false} />
    ),
    [FramePanelMode.Create]: (
      <FrameEditPanel setActivePanel={setActivePanel} isCreateMode />
    ),
  } as const satisfies Record<FramePanelMode, ReactNode>;

  return <FramesTabBlock {...props}>{panelByMode[activePanel]}</FramesTabBlock>;
}
