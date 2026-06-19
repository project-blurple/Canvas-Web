import { styled } from "@mui/material";
import { useAuthContext, useSelectedFrameContext } from "@/contexts";
import {
  ActionPanelTabBody,
  FullWidthScrollView,
} from "../action-panel/tabs/ActionPanelTabBody";
import BotCommandCard from "../action-panel/tabs/BotCommandCard";
import { FramePanelMode } from "../action-panel/tabs/FramesTab";
import { BasicHighlightButton } from "../button/BasicButtons";
import FrameList from "./FrameList";

const FrameListPanelBodyShell = styled("div")`
  display: grid;
  grid-template-rows: 1fr;
  opacity: 1;
  overflow: hidden;
  transform: translateY(0);
  transition-duration: var(--transition-duration-slow);
  transition-property: grid-template-rows, transform;
  transition-timing-function: var(--ease-out-cubic);

  @container --frame-tabpanel (height < 30rem) {
    grid-template-rows: 0fr;
    pointer-events: none;
    transform: translateY(3rem);
  }

  > * {
    min-height: 0;
  }
`;

export default function FrameListPanel({
  enabled = true,
  setActivePanel,
}: {
  enabled?: boolean;
  setActivePanel: (panel: FramePanelMode) => void;
}) {
  const { frame } = useSelectedFrameContext();

  if (frame) {
    setActivePanel(FramePanelMode.Details);
  }

  return (
    <>
      <FullWidthScrollView>
        <FrameList enabled={enabled} />
      </FullWidthScrollView>
      <FrameListPanelBody setActivePanel={setActivePanel} />
    </>
  );
}

function FrameListPanelBody({
  setActivePanel,
}: {
  setActivePanel: (panel: FramePanelMode) => void;
}) {
  const { user } = useAuthContext();

  if (user) {
    return (
      <FrameListPanelBodyShell>
        <ActionPanelTabBody>
          <BotCommandCard command="/frame create" />
          <BasicHighlightButton
            onClick={() => {
              setActivePanel(FramePanelMode.Create);
            }}
          >
            New frame
          </BasicHighlightButton>
        </ActionPanelTabBody>
      </FrameListPanelBodyShell>
    );
  }

  return null;
}
