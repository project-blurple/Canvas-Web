import {
  type CanvasInfo,
  type DiscordUserProfile,
  type Frame,
  FrameOwnerType,
  type PaletteColorSummary,
  type StatisticsSummaryBase,
} from "@blurple-canvas-web/types";
import { styled } from "@mui/material";
import {
  ChartNoAxesColumn,
  CircleStar,
  Crosshair,
  Hash,
  Link,
  Frame as LucideFrame,
  Palette,
  SquarePen,
  User,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import config from "@/config/clientConfig";
import { useAuthContext } from "@/contexts/AuthProvider";
import { useCanvasContext } from "@/contexts/CanvasContext";
import { useCanvasViewContext } from "@/contexts/CanvasViewContext";
import { useSelectedFrame } from "@/contexts/SelectedFrameContext";
import { useCanvasStats } from "@/hooks/queries/useCanvasStats";
import { useFrameStats } from "@/hooks/queries/useFrameStats";
import {
  useCanvasLeaderboard,
  useFrameLeaderboard,
} from "@/hooks/queries/useLeaderboard";
import { usePalette } from "@/hooks/queries/usePalette";
import { calculateScale, createPixelUrl } from "@/util";
import { isSystemFrameId } from "@/util/frame";
import Avatar from "../Avatar";
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
  opacity: 0.6;
  overflow: visible;
  position: relative;
  white-space: nowrap;
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

const LeaderboardList = styled("ol")`
  display: grid;
  font-size: 1rem;
  grid-template-columns: auto 1fr auto;
  gap: 0.5rem;
`;

const LeaderboardRow = styled("li")`
  align-items: center;
  column-gap: 0.75rem;
  display: grid;
  grid-column: 1 / -1;
  grid-template-columns: subgrid;
  padding: 0.5rem;
`;

const LeaderboardRank = styled("div")`
  color: oklch(from currentColor l c h / 45%);
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  text-align: center;
`;

const LeaderboardUsername = styled("div")`
  font-weight: 600;
  word-break: break-all;
`;

const LeaderboardPixelCount = styled("div")`
  color: oklch(from var(--discord-white) l c h / 55%);
  font-variant-numeric: tabular-nums;
  font-size: 0.875rem;
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
    const scale = calculateScale(frame.width * frame.height);

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

function DetailsCard({
  frame,
  stats,
  palette,
}: {
  frame: Frame;
  stats?: StatisticsSummaryBase | null;
  palette: PaletteColorSummary[];
}) {
  const ownerInfo = (() => {
    switch (frame.owner.type) {
      case FrameOwnerType.Guild:
        return {
          icon: <CircleStar aria-hidden />,
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

  const mostPlacedColor = stats?.colorDistribution[0];
  const mostPlacedColorInfo = palette.find(
    (color) => color.id === mostPlacedColor?.colorId,
  );

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
                {frame.width.toLocaleString()}{" "}
                <X
                  size={16}
                  style={{ display: "inline", verticalAlign: "middle" }}
                />{" "}
                {frame.height.toLocaleString()}
              </TableCell>
            </tr>
            {stats && (
              <>
                <tr>
                  <TableHeader>
                    <ChartNoAxesColumn />
                    <VisuallyHidden>Total pixels placed</VisuallyHidden>
                  </TableHeader>
                  <TableCell>
                    {stats.totalPixelsPlaced.toLocaleString()} pixels placed
                  </TableCell>
                </tr>
                <tr>
                  <TableHeader>
                    <Users />
                    <VisuallyHidden>Total users involved</VisuallyHidden>
                  </TableHeader>
                  <TableCell>
                    {stats.totalUsersInvolved.toLocaleString()} users
                  </TableCell>
                </tr>
                {mostPlacedColorInfo && (
                  <tr>
                    <TableHeader>
                      <Palette />
                      <VisuallyHidden>Most placed color</VisuallyHidden>
                    </TableHeader>
                    <TableCell>
                      Most placed: {mostPlacedColorInfo.name}
                    </TableCell>
                  </tr>
                )}
              </>
            )}
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

function Leaderboard({
  frame,
  stats,
  palette,
}: {
  frame: Frame;
  stats: StatisticsSummaryBase;
  palette: PaletteColorSummary[];
}) {
  const [selectedColor, setSelectedColor] =
    useState<PaletteColorSummary | null>(null);

  const canvasLeaderboard = useCanvasLeaderboard(
    frame.canvasId,
    {
      size: 10,
      page: 1,
      colorId: selectedColor?.id,
    },
    {
      enabled: isSystemFrameId(frame.id),
    },
  );

  const frameLeaderboard = useFrameLeaderboard(
    frame.id,
    {
      size: 10,
      page: 1,
      colorId: selectedColor?.id,
    },
    {
      enabled: !isSystemFrameId(frame.id),
    },
  );

  const leaderboard =
    isSystemFrameId(frame.id) ? canvasLeaderboard : frameLeaderboard;

  if (stats.totalPixelsPlaced === 0) {
    return null;
  }

  const usedColors = stats.colorDistribution
    .map((colorStat) => palette.find((color) => color.id === colorStat.colorId))
    .filter((color): color is PaletteColorSummary => color !== undefined);

  return (
    <ActionPanelTabBody>
      <div>
        <ActionPanelPrimitives.SectionHeading>
          Leaderboard
        </ActionPanelPrimitives.SectionHeading>
        <select
          value={selectedColor?.id ?? ""}
          onChange={(e) => {
            const color =
              palette.find(
                (c) => c.id === Number.parseInt(e.target.value, 10),
              ) ?? null;
            setSelectedColor(color);
          }}
        >
          <option value="">All colors</option>
          {usedColors.map((color) => (
            <option key={color.id} value={color.id}>
              {color.name}
            </option>
          ))}
        </select>
        <div>
          {leaderboard.isFetching ?
            <p>Loading leaderboard...</p>
          : leaderboard.data?.entries.length ?
            <LeaderboardList>
              {leaderboard.data.entries.map((entry) => (
                <LeaderboardRow key={entry.userId}>
                  <LeaderboardRank>{entry.rank}</LeaderboardRank>
                  <div>
                    <LeaderboardUsername>
                      {entry.username ?? entry.userId}
                    </LeaderboardUsername>
                    <LeaderboardPixelCount>
                      {entry.totalPixels.toLocaleString()}{" "}
                      {entry.totalPixels === 1 ? "pixel" : "pixels"}
                    </LeaderboardPixelCount>
                  </div>
                  <Avatar
                    profilePictureUrl={entry.profilePictureUrl}
                    size={40}
                    username={entry.username ?? entry.userId}
                  />
                </LeaderboardRow>
              ))}
            </LeaderboardList>
          : <p>No leaderboard data available.</p>}
        </div>
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
  const { data: palette = [] } = usePalette(canvas.eventId ?? undefined);
  const { data: frameStats } = useFrameStats(frame?.id, {
    enabled: !isSystemFrameId(frame?.id),
  });
  const { data: canvasStats } = useCanvasStats(canvas.id, {
    enabled: isSystemFrameId(frame?.id),
  });

  if (!frame) {
    setActivePanel(FramePanelMode.List);
    return null;
  }

  const stats = isSystemFrameId(frame.id) ? canvasStats : frameStats;

  const userHasPermsToEditSelectedFrame = user && userCanEditFrame(user, frame);

  return (
    <FrameDetailsPanelBodyShell>
      <ActionPanelTabBody>
        <Heading>{frame.name}</Heading>
      </ActionPanelTabBody>
      <FullWidthScrollView>
        <DetailsCard frame={frame} stats={stats} palette={palette} />
        {stats && <Leaderboard frame={frame} stats={stats} palette={palette} />}
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
