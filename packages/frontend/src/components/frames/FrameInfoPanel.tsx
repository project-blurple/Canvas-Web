import {
  type DiscordUserProfile,
  type Frame,
  FrameOwnerType,
} from "@blurple-canvas-web/types";
import { styled } from "@mui/material";
import { toast } from "sonner";
import config from "@/config/clientConfig";
import {
  useAuthContext,
  useCanvasContext,
  useSelectedFrameContext,
} from "@/contexts";
import { calculateScale, createPixelUrl, hexStringToPixelColor } from "@/util";
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
  drawerIsLarge,
}: {
  enabled?: boolean;
  setActivePanel: (panel: FramePanelMode) => void;
  drawerIsLarge: boolean;
}) {
  return (
    <>
      <FullWidthScrollView>
        <FrameList enabled={enabled} />
      </FullWidthScrollView>
      <FrameInfoPanelBody
        setActivePanel={setActivePanel}
        drawerIsLarge={drawerIsLarge}
      />
    </>
  );
}

function FrameInfoPanelBody({
  setActivePanel,
  drawerIsLarge,
}: {
  setActivePanel: (panel: FramePanelMode) => void;
  drawerIsLarge?: boolean;
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
    const downloadLink = (() => {
      const scale = calculateScale(
        (selectedFrame.x1 - selectedFrame.x0 + 1) *
          (selectedFrame.y1 - selectedFrame.y0 + 1),
      );

      if (selectedFrame.owner.type === FrameOwnerType.System) {
        const baseUrl = `${config.apiUrl}/api/v1/canvas/${encodeURIComponent(canvas.id)}/frame/${encodeURIComponent(selectedFrame.id)}@${scale}.png`;

        const isWholeCanvas =
          selectedFrame.x0 <= 0 &&
          selectedFrame.y0 <= 0 &&
          selectedFrame.x1 >= canvas.width - 1 &&
          selectedFrame.y1 >= canvas.height - 1;

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
          <ButtonWrapper>
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
            <a href={downloadLink} target="_blank" rel="noopener noreferrer">
              <DynamicButton
                color={color}
                disabled={!frameUrl}
                style={{ inlineSize: "100%" }}
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
