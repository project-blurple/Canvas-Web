import {
  type DiscordUserProfile,
  type Frame,
  FrameOwnerType,
} from "@blurple-canvas-web/types";
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
import { DynamicButton } from "../button";
import FrameList from "./FrameList";
import FrameInfoCard from "./SelectedFrameInfoCard";

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
      createPixelUrl({
        canvasId: canvas.id,
        frameId: selectedFrame.id,
      })
    : "";

  const userHasPermsToEditSelectedFrame =
    selectedFrame && user && userCanEditFrame(user, selectedFrame);

  if (selectedFrame) {
    return (
      <ActionPanelTabBody>
        <FrameInfoCard frame={selectedFrame} />
        {userHasPermsToEditSelectedFrame && (
          <DynamicButton
            color={null}
            onAction={() => {
              setActivePanel(FramePanelMode.Edit);
            }}
          >
            Edit frame
          </DynamicButton>
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
    );
  }

  if (user) {
    return (
      <ActionPanelTabBody>
        <BotCommandCard command="/frame create" />
        <DynamicButton
          color={null}
          onAction={() => {
            setActivePanel(FramePanelMode.Create);
          }}
        >
          New frame
        </DynamicButton>
      </ActionPanelTabBody>
    );
  }

  return null;
}
