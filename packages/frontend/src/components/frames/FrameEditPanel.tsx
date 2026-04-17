import { useAuthContext } from "@/contexts";
import {
  ActionPanelTabBody,
  ScrollBlock,
} from "../action-panel/tabs/ActionPanelTabBody";
import {
  FRAME_PANEL_STATE,
  FramePanelState,
} from "../action-panel/tabs/FramesTab";
import { DynamicButton } from "../button";

export default function FrameEditPanel({
  setActivePanel,
}: {
  setActivePanel: (panel: FramePanelState) => void;
}) {
  const { user } = useAuthContext();

  if (!user) {
    // Shouldn't be able to get to this tab without being logged in,
    // but this prevents that at the least
    setActivePanel(FRAME_PANEL_STATE.Info);
    return null;
  }

  return (
    <>
      <ScrollBlock>
        <ActionPanelTabBody>
          <p>content here</p>
        </ActionPanelTabBody>
      </ScrollBlock>
      <ActionPanelTabBody>
        <DynamicButton
          color={null}
          onAction={() => {
            setActivePanel(FRAME_PANEL_STATE.Info);
          }}
        >
          Back
        </DynamicButton>
      </ActionPanelTabBody>
    </>
  );
}
