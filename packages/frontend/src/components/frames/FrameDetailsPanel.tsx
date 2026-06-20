import {
  type CanvasInfo,
  type DiscordUserProfile,
  type Frame,
  FrameOwnerType,
} from "@blurple-canvas-web/types";
import { styled } from "@mui/material";
import {
  Crosshair,
  Hash,
  Link,
  Frame as LucideFrame,
  SquarePen,
  User,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import config from "@/config/clientConfig";
import { useAuthContext } from "@/contexts/AuthProvider";
import { useCanvasContext } from "@/contexts/CanvasContext";
import { useCanvasViewContext } from "@/contexts/CanvasViewContext";
import { useSelectedFrame } from "@/contexts/SelectedFrameContext";
import { calculateScale, createPixelUrl } from "@/util";
import ActionPanelPrimitives from "../action-panel/primitives";
import {
  ActionPanelTabBody,
  FullWidthScrollView,
  TabPanel,
} from "../action-panel/tabs/ActionPanelTabBody";
import { FramePanelMode } from "../action-panel/tabs/FramesTab";
import { BasicButton, ButtonSupplement } from "../button";
import { BasicHighlightButton } from "../button/BasicButtons";
import CanvasIcon from "../CanvasIcon";
import VisuallyHidden from "../VisuallyHidden";

const FrameDetailsPanelBodyShell = styled(TabPanel)`
  display: grid;
`;

const Heading = styled("h3")`
  color: var(--discord-white);
  font-size: 1.375rem;
  font-weight: 900;
  line-height: 1.1;
`;

const DetailsTable = styled("table")`
  max-inline-size: 100%;
  width: 100%;

  tr:not(:last-child) > :is(td, th) {
    padding-block-end: 0.75rem;
  }
`;

const TableHeader = styled("th")`
  inline-size: 2.5rem;
  white-space: nowrap;
  opacity: 0.6;
`;

const TableCell = styled("td")`
  block-size: 100%;
  font-size: 1.125rem;
  padding: 0;

  code {
    font-size: 0.85em;
  }
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
    case FrameOwnerType.System:
      return false;
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
    <a
      href={downloadLink}
      rel="noopener noreferrer"
      style={{ display: "contents" }}
      target="_blank"
    >
      <BasicHighlightButton style={{ inlineSize: "100%" }}>
        Image
        <ButtonSupplement>{`(PNG)`}</ButtonSupplement>
      </BasicHighlightButton>
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
      aria-label="Copy frame link"
      onClick={async () => {
        void (await navigator.clipboard.writeText(frameUrl));
        toast.success("Copied frame link");
      }}
    >
      <Link />
    </BasicButton>
  );
}

function DetailsCard({ frame }: { frame: Frame }) {
  const frameSize = [frame.x1 - frame.x0, frame.y1 - frame.y0];

  const ownerInfo = (() => {
    switch (frame.owner.type) {
      case FrameOwnerType.Guild:
        return {
          icon: <Users aria-hidden />,
          label: frame.owner.guild.name ?? "Unknown guild",
        };
      case FrameOwnerType.User:
        return {
          icon: <User aria-hidden />,
          label: frame.owner.user.username ?? "Unknown user",
        };
      default:
        return {
          icon: <CanvasIcon aria-hidden />,
          label: "Blurple Canvas",
        };
    }
  })();

  return (
    <ActionPanelTabBody>
      <div>
        <ActionPanelPrimitives.SectionHeading>
          Details
        </ActionPanelPrimitives.SectionHeading>
        <DetailsTable>
          <tbody>
            <tr>
              <TableHeader>
                {ownerInfo.icon}
                <VisuallyHidden>Frame owner</VisuallyHidden>
              </TableHeader>
              <TableCell>{ownerInfo.label}</TableCell>
            </tr>
            <tr>
              <TableHeader>
                <LucideFrame />
                <VisuallyHidden>Frame dimensions</VisuallyHidden>
              </TableHeader>
              <TableCell>
                {frameSize[0]}{" "}
                <X
                  size={16}
                  style={{ display: "inline", verticalAlign: "middle" }}
                />{" "}
                {frameSize[1]}
              </TableCell>
            </tr>
            {frame.owner.type !== FrameOwnerType.System && (
              <tr>
                <TableHeader>
                  <Hash />
                  <VisuallyHidden>Frame ID</VisuallyHidden>
                </TableHeader>
                <TableCell>
                  <code>{frame.id}</code>
                </TableCell>
              </tr>
            )}
          </tbody>
        </DetailsTable>
      </div>
    </ActionPanelTabBody>
  );
}

export default function FrameDetailsPanel({
  setActivePanel,
}: {
  setActivePanel: (panel: FramePanelMode) => void;
}) {
  const { user } = useAuthContext();
  const { frame, setFrame } = useSelectedFrame();
  const { canvas } = useCanvasContext();
  const { focusOnFrame } = useCanvasViewContext();

  if (!frame) {
    setActivePanel(FramePanelMode.List);
    return null;
  }

  const userHasPermsToEditSelectedFrame = user && userCanEditFrame(user, frame);

  return (
    <FrameDetailsPanelBodyShell>
      <ActionPanelTabBody>
        <Heading>{frame.name}</Heading>
      </ActionPanelTabBody>
      <FullWidthScrollView>
        <DetailsCard frame={frame} />
      </FullWidthScrollView>
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
      <ActionPanelTabBody>
        <ControlButtonRow>
          <FrameLinkButton frame={frame} canvas={canvas} />
          <BasicButton
            aria-label="Focus on frame"
            onClick={() => focusOnFrame(frame)}
          >
            <Crosshair />
          </BasicButton>
          {userHasPermsToEditSelectedFrame && (
            <BasicButton
              aria-label="Edit frame"
              onClick={() => setActivePanel(FramePanelMode.Edit)}
            >
              <SquarePen />
            </BasicButton>
          )}
        </ControlButtonRow>
      </ActionPanelTabBody>
      <BasicButton onClick={() => setFrame(null)}>Back</BasicButton>
    </FrameDetailsPanelBodyShell>
  );
}
