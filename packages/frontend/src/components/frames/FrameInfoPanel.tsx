import {
  type DiscordUserProfile,
  type Frame,
  FrameOwnerType,
} from "@blurple-canvas-web/types";
import { styled } from "@mui/material";
import config from "@/config/clientConfig";
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
import { TooltipDynamicButton } from "../action-panel/tabs/ActionPanelTooltip";
import BotCommandCard from "../action-panel/tabs/BotCommandCard";
import { FramePanelMode } from "../action-panel/tabs/FramesTab";
import { Button } from "../button";
import { useSlideableDrawerContext } from "../slideable-drawer";
import FrameList from "./FrameList";
import FrameInfoCard from "./SelectedFrameInfoCard";

const FrameInfoPanelBodyShell = styled("div")`
  display: grid;
  grid-template-rows: 1fr;
  opacity: 1;
  overflow: hidden;
  transform: translateY(0);
  transition-duration: 280ms;
  transition-property: grid-template-rows, transform;
  transition-timing-function: ease;

  &[aria-hidden="true"] {
    grid-template-rows: 0fr;
    opacity: 0;
    pointer-events: none;
    transform: translateY(0.75rem);
  }

  > * {
    min-height: 0;
  }
`;

const ButtonWrapper = styled("div")`
  background: transparent;
  display: flex;
  gap: 0.5rem;
  padding: 0;

  > * {
    flex: 1;
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

function calculateScale(pixelCount: number): number {
  // TODO: this is duped from another PR, should dedupe once merged
  if (pixelCount <= 90_000) return 4; // 300x300
  if (pixelCount <= 360_000) return 2; // 600x600
  return 1;
}

function FrameInfoPanelBody({
  setActivePanel,
}: {
  setActivePanel: (panel: FramePanelMode) => void;
}) {
  const slideableDrawerState = useSlideableDrawerContext();
  const { user } = useAuthContext();
  const { canvas } = useCanvasContext();
  const { frame: selectedFrame } = useSelectedFrameContext();
  const shouldCollapse = slideableDrawerState?.isMiddleSnap;

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
    const downloadLink = (() => {
      const scale = calculateScale(
        (selectedFrame.x1 - selectedFrame.x0 + 1) *
          (selectedFrame.y1 - selectedFrame.y0 + 1),
      );

      if (selectedFrame.owner.type === FrameOwnerType.System) {
        const baseUrl = `${config.apiUrl}/api/v1/canvas/${canvas.id}@${scale}.png`;

        const isWholeCanvas =
          selectedFrame.x0 === 0 &&
          selectedFrame.y0 === 0 &&
          selectedFrame.x1 === canvas.width - 1 &&
          selectedFrame.y1 === canvas.height - 1;

        if (isWholeCanvas) {
          return baseUrl;
        }

        return `${baseUrl}?${new URLSearchParams({
          x0: selectedFrame.x0.toString(),
          y0: selectedFrame.y0.toString(),
          x1: selectedFrame.x1.toString(),
          y1: selectedFrame.y1.toString(),
        })}`;
      }

      return `${config.apiUrl}/api/v1/frame/${selectedFrame.id}@${scale}.png`;
    })();

    const color = hexStringToPixelColor(selectedFrame.id);

    return (
      <FrameInfoPanelBodyShell aria-hidden={shouldCollapse}>
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
          <ButtonWrapper>
            {selectedFrame.owner.type !== FrameOwnerType.System && (
              <TooltipDynamicButton
                color={color}
                tooltipTitle="Copied"
                onAction={() => {
                  navigator.clipboard.writeText(frameUrl);
                }}
              >
                Copy frame link
              </TooltipDynamicButton>
            )}
            <a href={downloadLink} target="_blank" rel="noopener noreferrer">
              <DynamicButton
                color={color}
                disabled={!frameUrl}
                style={{ width: "100%" }}
              >
                Download
              </DynamicButton>
            </a>
          </ButtonWrapper>
        </ActionPanelTabBody>
      </FrameInfoPanelBodyShell>
    );
  }

  if (user) {
    return (
      <FrameInfoPanelBodyShell aria-hidden={shouldCollapse}>
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
