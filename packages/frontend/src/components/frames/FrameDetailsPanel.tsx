import { useSelectedFrameContext } from "@/contexts/SelectedFrameContext";
import ActionPanelPrimitives from "../action-panel/primitives";
import { ActionPanelTabBody } from "../action-panel/tabs/ActionPanelTabBody";
import { FramePanelMode } from "../action-panel/tabs/FramesTab";

export default function FrameDetailsPanel({
  setActivePanel,
}: {
  setActivePanel: (panel: FramePanelMode) => void;
}) {
  const { frame } = useSelectedFrameContext();

  if (!frame) {
    setActivePanel(FramePanelMode.List);
    return null;
  }
  return (
    <div>
      <ActionPanelTabBody>
        <div>
          <ActionPanelPrimitives.SectionHeading>
            Frame details
          </ActionPanelPrimitives.SectionHeading>
          {frame.name}
        </div>
      </ActionPanelTabBody>
    </div>
  );
}
