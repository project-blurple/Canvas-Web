import type { ValueOf } from "@blurple-canvas-web/types";
import { styled } from "@mui/material";
import { type ReactNode, useEffect, useState } from "react";
import FrameEditPanel from "@/components/frames/FrameEditPanel";
import FrameInfoPanel from "@/components/frames/FrameInfoPanel";
import { useElementIsLarge } from "@/hooks/useElementIsLarge";
import { TabPanel } from "./ActionPanelTabBody";

const FramesTabBlock = styled(TabPanel)`
  container: --frame-tabpanel / size;
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
  active?: boolean;
  setTabsLocked: (locked: boolean) => void;
}

export default function FramesTab({
  active = false,
  setTabsLocked,
  ...props
}: FramesTabProps) {
  const [activePanel, setActivePanel] = useState<FramePanelMode>(
    FramePanelMode.Info,
  );

  const [FrameTabBlockRef, drawerIsLarge] = useElementIsLarge(30);

  useEffect(() => {
    setTabsLocked(activePanel !== FramePanelMode.Info);
  }, [activePanel, setTabsLocked]);

  const panelByMode = {
    [FramePanelMode.Info]: (
      <FrameInfoPanel
        setActivePanel={setActivePanel}
        enabled={active}
        drawerIsLarge={drawerIsLarge}
      />
    ),
    [FramePanelMode.Edit]: (
      <FrameEditPanel setActivePanel={setActivePanel} mode="edit" />
    ),
    [FramePanelMode.Create]: (
      <FrameEditPanel setActivePanel={setActivePanel} mode="create" />
    ),
  } as const satisfies Record<FramePanelMode, ReactNode>;

  return (
    <FramesTabBlock active={active} ref={FrameTabBlockRef} {...props}>
      {panelByMode[activePanel]}
    </FramesTabBlock>
  );
}
