import { DiscordUserProfile, Frame } from "@blurple-canvas-web/types";
import {
  useAuthContext,
  useCanvasContext,
  useSelectedFrameContext,
} from "@/contexts";
import { createPixelUrl, hexStringToPixelColor } from "@/util";
import {
  ActionPanelTabBody,
  ScrollableView,
} from "../action-panel/tabs/ActionPanelTabBody";
import { TooltipDynamicButton } from "../action-panel/tabs/ActionPanelTooltip";
import BotCommandCard from "../action-panel/tabs/BotCommandCard";
import { FramePanelMode } from "../action-panel/tabs/FramesTab";
import { DynamicButton } from "../button";
import FrameList from "./FrameList";
import FrameInfoCard from "./SelectedFrameInfoCard";

function userCanEditFrame(user: DiscordUserProfile, frame: Frame): boolean {
  switch (frame.owner.type) {
    case "system":
      return false;
    case "user":
      return frame.owner.user.id === user.id;
    case "guild": {
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

  return (
    <>
      <ScrollableView>
        <FrameList />
      </ScrollableView>
      {(() => {
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
              {selectedFrame.owner.type !== "system" && (
                <TooltipDynamicButton
                  color={hexStringToPixelColor(selectedFrame.id)}
                  tooltipTitle="Copied"
                  onAction={() => {
                    navigator.clipboard.writeText(frameUrl);
                  }}
                >
                  Copy frame link
                </TooltipDynamicButton>
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
                Create frame
              </DynamicButton>
            </ActionPanelTabBody>
          );
        }

        return null;
      })()}
    </>
  );
}
