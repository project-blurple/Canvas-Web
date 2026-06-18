import {
  type CanvasInfo,
  type DiscordUserProfile,
  type Frame,
  FrameOwnerType,
} from "@blurple-canvas-web/types";
import { styled } from "@mui/material";
import { ArrowLeftFromLine, Crosshair, Link, SquarePen } from "lucide-react";
import { toast } from "sonner";
import config from "@/config/clientConfig";
import { useAuthContext } from "@/contexts/AuthProvider";
import { useCanvasContext } from "@/contexts/CanvasContext";
import { useSelectedFrameContext } from "@/contexts/SelectedFrameContext";
import { calculateScale, createPixelUrl, hexStringToPixelColor } from "@/util";
import ActionPanelPrimitives from "../action-panel/primitives";
import {
  ActionPanelTabBody,
  TabPanel,
} from "../action-panel/tabs/ActionPanelTabBody";
import { FramePanelMode } from "../action-panel/tabs/FramesTab";
import { BasicButton, DynamicButton } from "../button";
import FrameListCard from "./SelectedFrameListCard";

const FrameDetailsPanelBodyShell = styled(TabPanel)`
  display: grid;
  grid-template-rows: 1fr auto;
`;

const ControlButtonRow = styled("div")`
  background: transparent;
  display: flex;
  gap: 0.5rem;
  padding: 0;

  > * {
    flex: 1;
  }
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

function DownloadButton({
  frame,
  canvas,
}: {
  frame: Frame;
  canvas: CanvasInfo;
}) {
  const downloadLink = (() => {
    const scale = calculateScale(
      (frame.x1 - frame.x0 + 1) * (frame.y1 - frame.y0 + 1),
    );

    if (frame.owner.type === FrameOwnerType.System) {
      const baseUrl = `${config.apiUrl}/api/v1/canvas/${encodeURIComponent(canvas.id)}/frame/${encodeURIComponent(frame.id)}@${scale}.png`;

      const isWholeCanvas =
        frame.x0 <= 0 &&
        frame.y0 <= 0 &&
        frame.x1 >= canvas.width - 1 &&
        frame.y1 >= canvas.height - 1;

      if (isWholeCanvas) {
        return baseUrl;
      }

      return `${baseUrl}?${new URLSearchParams({
        x0: frame.x0.toString(),
        y0: frame.y0.toString(),
        x1: frame.x1.toString(),
        y1: frame.y1.toString(),
      })}`;
    }

    return `${config.apiUrl}/api/v1/frame/${frame.id}@${scale}.png`;
  })();

  return (
    <a href={downloadLink} target="_blank" rel="noopener noreferrer">
      <DynamicButton
        color={hexStringToPixelColor(frame.id)}
        style={{ inlineSize: "100%" }}
      >
        Image
      </DynamicButton>
    </a>
  );
}

function FrameLinkButton({
  frame,
  canvas,
}: {
  frame: Frame;
  canvas: CanvasInfo;
}) {
  if (frame.owner.type === FrameOwnerType.System) {
    return null;
  }

  const frameUrl = createPixelUrl({ canvasId: canvas.id, frameId: frame.id });

  return (
    <BasicButton
      onClick={async () => {
        void (await navigator.clipboard.writeText(frameUrl));
        toast.success("Copied frame link");
      }}
    >
      <Link />
    </BasicButton>
  );
}

export default function FrameDetailsPanel({
  setActivePanel,
}: {
  setActivePanel: (panel: FramePanelMode) => void;
}) {
  const { user } = useAuthContext();
  const { frame, setFrame } = useSelectedFrameContext();
  const { canvas } = useCanvasContext();

  if (!frame) {
    setActivePanel(FramePanelMode.List);
    return null;
  }

  const userHasPermsToEditSelectedFrame =
    frame && user && userCanEditFrame(user, frame);

  return (
    <FrameDetailsPanelBodyShell>
      <ActionPanelTabBody>
        <FrameListCard frame={frame} />
      </ActionPanelTabBody>
      <ActionPanelTabBody>
        <ControlButtonRow>
          <BasicButton onClick={() => setFrame(null)}>
            <ArrowLeftFromLine />
          </BasicButton>
          <BasicButton>
            <Crosshair />
          </BasicButton>
          <FrameLinkButton frame={frame} canvas={canvas} />
          {userHasPermsToEditSelectedFrame && (
            <BasicButton onClick={() => setActivePanel(FramePanelMode.Edit)}>
              <SquarePen />
            </BasicButton>
          )}
        </ControlButtonRow>
      </ActionPanelTabBody>
      <ActionPanelTabBody>
        <div>
          <ActionPanelPrimitives.SectionHeading>
            Downloads
          </ActionPanelPrimitives.SectionHeading>
          <DownloadButton frame={frame} canvas={canvas} />
          {/* Download timelapse */}
          {/* Export stats */}
        </div>
      </ActionPanelTabBody>
    </FrameDetailsPanelBodyShell>
  );
}
