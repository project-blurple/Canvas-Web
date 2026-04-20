import { DiscordUserProfile, Frame } from "@blurple-canvas-web/types";
import { useState } from "react";
import {
  useAuthContext,
  useCanvasContext,
  useSelectedFrameContext,
} from "@/contexts";
import { createPixelUrl, hexStringToPixelColor } from "@/util";
import {
  ActionPanelTabBody,
  ScrollBlock,
} from "../action-panel/tabs/ActionPanelTabBody";
import ActionPanelTooltip from "../action-panel/tabs/ActionPanelTooltip";
import BotCommandCard from "../action-panel/tabs/BotCommandCard";
import { FramePanelMode } from "../action-panel/tabs/FramesTab";
import { DynamicButton } from "../button";
import FrameList from "./FrameList";
import FrameInfoCard from "./SelectedFrameInfoCard";

function userCanEditFrame(user: DiscordUserProfile, frame: Frame): boolean {
  if (frame.owner.type === "system") {
    return false;
  }

  if (frame.owner.type === "user") {
    return frame.owner.user.id === user.id;
  }

  if (frame.owner.type === "guild") {
    const guildId = frame.owner.guild.guild_id;
    const userGuildData = user.guilds?.[guildId];
    return (
      userGuildData !== undefined &&
      (userGuildData.administrator || userGuildData.manageGuild)
    );
  }

  return false;
}

export default function FrameInfoPanel({
  setActivePanel,
}: {
  setActivePanel: (panel: FramePanelMode) => void;
}) {
  const { user } = useAuthContext();
  const { canvas } = useCanvasContext();
  const { frame: selectedFrame } = useSelectedFrameContext();

  const [tooltipIsOpen, setTooltipIsOpen] = useState(false);

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
      <ScrollBlock>
        <FrameList />
      </ScrollBlock>
      {selectedFrame ?
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
            <ActionPanelTooltip
              title="Copied"
              onClose={() => {
                setTooltipIsOpen(false);
              }}
              open={tooltipIsOpen}
            >
              <DynamicButton
                color={hexStringToPixelColor(selectedFrame.id)}
                onAction={() => {
                  setTooltipIsOpen(true);
                  navigator.clipboard.writeText(frameUrl);
                }}
              >
                Copy frame link
              </DynamicButton>
            </ActionPanelTooltip>
          )}
        </ActionPanelTabBody>
      : user ?
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
      : null}
    </>
  );
}
