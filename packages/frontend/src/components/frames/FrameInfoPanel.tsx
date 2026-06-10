import {
  type DiscordUserProfile,
  type Frame,
  FrameOwnerType,
} from "@blurple-canvas-web/types";
import { styled } from "@mui/material";
import { toast } from "sonner";
import {
  useAuthContext,
  useCanvasContext,
  useSelectedFrameContext,
} from "@/contexts";
import { createPixelUrl, hexStringToPixelColor } from "@/util";
import {
  ActionPanelTabBody,
  FullWidthScrollView,
} from "../action-panel/tabs/ActionPanelTabBody";
import BotCommandCard from "../action-panel/tabs/BotCommandCard";
import { FramePanelMode } from "../action-panel/tabs/FramesTab";
import { Button, DynamicButton } from "../button";
import FrameList from "./FrameList";
import FrameInfoCard from "./SelectedFrameInfoCard";

const FrameInfoPanelBodyShell = styled("div")`
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
`;

function userCanEditFrame(user: DiscordUserProfile, frame: Frame): boolean {
  switch (frame.owner.type) {
    case FrameOwnerType.System:
      return false;
    case FrameOwnerType.User:
      return frame.owner.user.id === user.id;
    case FrameOwnerType.Guild: {
      const guildId = frame.owner.guild.guild_id;
      const userGuildData = user.guilds?.[guildId];
      return (
        userGuildData !== undefined &&
        (userGuildData.administrator || userGuildData.manageGuild)
      );
    }
    default:
      return false;
  }
}

export default function FrameInfoPanel({
  enabled = true,
  setActivePanel,
}: {
  enabled?: boolean;
  setActivePanel: (panel: FramePanelMode) => void;
}) {
  return (
    <>
      <FullWidthScrollView>
        <FrameList enabled={enabled} />
      </FullWidthScrollView>
      <FrameInfoPanelBody setActivePanel={setActivePanel} />
    </>
  );
}

function FrameInfoPanelBody({
  setActivePanel,
}: {
  setActivePanel: (panel: FramePanelMode) => void;
}) {
  const { user } = useAuthContext();
  const { canvas } = useCanvasContext();
  const { frame: selectedFrame } = useSelectedFrameContext();

  const frameUrl =
    selectedFrame ?
      createPixelUrl({ canvasId: canvas.id, frameId: selectedFrame.id })
    : "";

  const userHasPermsToEditSelectedFrame =
    selectedFrame && user && userCanEditFrame(user, selectedFrame);

  if (selectedFrame) {
    return (
      <FrameInfoPanelBodyShell>
        <ActionPanelTabBody>
          <FrameInfoCard frame={selectedFrame} />
          {userHasPermsToEditSelectedFrame && (
            <StyledButton
              onClick={() => {
                setActivePanel(FramePanelMode.Edit);
              }}
            >
              Edit frame
            </StyledButton>
          )}
          {selectedFrame.owner.type !== FrameOwnerType.System && (
            <DynamicButton
              color={hexStringToPixelColor(selectedFrame.id)}
              onAction={async () => {
                void (await navigator.clipboard.writeText(frameUrl));
                toast.success("Copied frame link");
              }}
            >
              Copy frame link
            </DynamicButton>
          )}
        </ActionPanelTabBody>
      </FrameInfoPanelBodyShell>
    );
  }

  if (user) {
    return (
      <FrameInfoPanelBodyShell>
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
      </FrameInfoPanelBodyShell>
    );
  }

  return null;
}
