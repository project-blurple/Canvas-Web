import { styled } from "@mui/material";
import { useAuthContext } from "@/contexts";
import {
  ActionPanelTabBody,
  FullWidthScrollView,
} from "../action-panel/tabs/ActionPanelTabBody";
import BotCommandCard from "../action-panel/tabs/BotCommandCard";
import { FramePanelMode } from "../action-panel/tabs/FramesTab";
import { Button } from "../button";
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

const StyledButton = styled(Button)`
  background-color: var(--discord-blurple);
  color: var(--discord-white);
  padding: default;
`;

export default function FrameListPanel({
  enabled = true,
  setActivePanel,
}: {
  enabled?: boolean;
  setActivePanel: (panel: FramePanelMode) => void;
}) {
  return (
    <>
      <FullWidthScrollView>
        <FrameList enabled={enabled} setActivePanel={setActivePanel} />
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
          <StyledButton
            onClick={() => {
              setActivePanel(FramePanelMode.Create);
            }}
          >
            New frame
          </StyledButton>
        </ActionPanelTabBody>
      </FrameListPanelBodyShell>
    );
  }

  return null;
}
