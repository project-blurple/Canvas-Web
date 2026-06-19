import type { ValueOf } from "@blurple-canvas-web/types";
import { styled } from "@mui/material";
import { type ReactNode, useEffect, useState } from "react";
import FrameDetailsPanel from "@/components/frames/FrameDetailsPanel";
import FrameEditPanel from "@/components/frames/FrameEditPanel";
import FrameListPanel from "@/components/frames/FrameListPanel";
import { TabPanel } from "./ActionPanelTabBody";

const FramesTabBlock = styled(TabPanel)`
  container: --frame-tabpanel / size;
  grid-template-rows: 1fr auto;
`;

export const FramePanelMode = {
  List: "list",
  Details: "details",
  Create: "create",
  Edit: "edit",
} as const;

export type FramePanelMode = ValueOf<typeof FramePanelMode>;

interface FramesTabProps extends React.ComponentPropsWithRef<
  typeof FramesTabBlock
> {
  active?: boolean;
  setTabsLocked: (locked: boolean) => void;
}

export default function FramesTab({
  active = false,
  setTabsLocked,
  ...props
}: FramesTabProps) {
  const [activePanel, setActivePanel] = useState<FramePanelMode>(
    FramePanelMode.List,
  );

  useEffect(() => {
    setTabsLocked(
      activePanel !== FramePanelMode.List &&
        activePanel !== FramePanelMode.Details,
    );
  }, [activePanel, setTabsLocked]);

  const panelByMode = {
    [FramePanelMode.List]: (
      <FrameListPanel setActivePanel={setActivePanel} enabled={active} />
    ),
    [FramePanelMode.Details]: (
      <FrameDetailsPanel setActivePanel={setActivePanel} />
    ),
    [FramePanelMode.Edit]: (
      <FrameEditPanel setActivePanel={setActivePanel} mode="edit" />
    ),
    [FramePanelMode.Create]: (
      <FrameEditPanel setActivePanel={setActivePanel} mode="create" />
    ),
  } as const satisfies Record<FramePanelMode, ReactNode>;

  return (
    <FramesTabBlock active={active} {...props}>
      {panelByMode[activePanel]}
    </FramesTabBlock>
  );
}
