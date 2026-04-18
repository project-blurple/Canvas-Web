import { CanvasInfo, GuildData, Point } from "@blurple-canvas-web/types";
import {
  FrameOwnerType,
  GuildOwnedFrame,
} from "@blurple-canvas-web/types/src/frame";
import {
  Autocomplete,
  InputLabel,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { RefObject, useEffect, useMemo, useRef, useState } from "react";
import {
  useAuthContext,
  useCanvasContext,
  useCanvasViewContext,
  useSelectedFrameContext,
} from "@/contexts";
import { useGuildFrames } from "@/hooks/queries/useFrame";
import { useCanvasImage } from "@/hooks/useCanvasImage";
import { normalizeFrameBounds, ViewBounds } from "@/util";
import { Heading } from "../action-panel/ActionPanel";
import {
  ActionPanelTabBody,
  ScrollBlock,
} from "../action-panel/tabs/ActionPanelTabBody";
import { FramePanelState } from "../action-panel/tabs/FramesTab";
import { DynamicButton } from "../button";
import {
  drawSourceRectToCanvas,
  FRAME_FILL_RATIO,
  PreviewCanvas,
} from "./FramePreview";

const EditContainer = styled("div")`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const PreviewContainer = styled("div")`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const EditPreviewCanvas = styled(PreviewCanvas)`
  height: auto;
`;

type GuildEntry = [string, GuildData];
type GuildOption = {
  guildId: string;
  guild: GuildData;
  group: string;
};

function getCurrentViewBounds({
  canvas,
  containerRef,
  offset,
  zoom,
}: {
  canvas: CanvasInfo;
  containerRef: RefObject<HTMLDivElement | null>;
  offset: Point;
  zoom: number;
}): ViewBounds {
  const containerWidth = containerRef.current?.clientWidth ?? 0;
  const containerHeight = containerRef.current?.clientHeight ?? 0;

  const left = canvas.width / 2 + (-containerWidth / 2 - offset.x) / zoom;
  const right = canvas.width / 2 + (containerWidth / 2 - offset.x) / zoom;
  const top = canvas.height / 2 + (-containerHeight / 2 - offset.y) / zoom;
  const bottom = canvas.height / 2 + (containerHeight / 2 - offset.y) / zoom;

  const clampedLeft = Math.max(0, Math.floor(left));
  const clampedTop = Math.max(0, Math.floor(top));
  const clampedRight = Math.min(canvas.width, Math.ceil(right));
  const clampedBottom = Math.min(canvas.height, Math.ceil(bottom));

  return {
    left: clampedLeft,
    top: clampedTop,
    right: clampedRight,
    bottom: clampedBottom,
    width: clampedRight - clampedLeft,
    height: clampedBottom - clampedTop,
  };
}

function fitViewBoundsToFillRatio(
  viewBounds: ViewBounds,
  frameFillRatio: number,
): ViewBounds {
  const centerX = (viewBounds.left + viewBounds.right) / 2;
  const centerY = (viewBounds.top + viewBounds.bottom) / 2;

  const left = centerX - (centerX - viewBounds.left) * frameFillRatio;
  const right = centerX + (viewBounds.right - centerX) * frameFillRatio;
  const top = centerY - (centerY - viewBounds.top) * frameFillRatio;
  const bottom = centerY + (viewBounds.bottom - centerY) * frameFillRatio;

  const clampedLeft = Math.max(0, Math.floor(left));
  const clampedTop = Math.max(0, Math.floor(top));
  const clampedRight = Math.min(viewBounds.right * 2, Math.ceil(right));
  const clampedBottom = Math.min(viewBounds.bottom * 2, Math.ceil(bottom));

  return {
    left: clampedLeft,
    top: clampedTop,
    right: clampedRight,
    bottom: clampedBottom,
    width: clampedRight - clampedLeft,
    height: clampedBottom - clampedTop,
  };
}

function splitGuildsByFramePresence(
  managedGuildEntries: GuildEntry[],
  guildFrames: GuildOwnedFrame[],
): [GuildEntry[], GuildEntry[]] {
  const guildIdsWithFrames = new Set(
    guildFrames.map((frame) => frame.owner.guild.guild_id),
  );

  return managedGuildEntries.reduce<[GuildEntry[], GuildEntry[]]>(
    (acc, entry) => {
      const [guildId] = entry;
      if (guildIdsWithFrames.has(guildId)) {
        acc[0].push(entry);
      } else {
        acc[1].push(entry);
      }
      return acc;
    },
    [[], []],
  );
}

export default function FrameEditPanel({
  setActivePanel,
  isCreateMode,
}: {
  setActivePanel: (panel: FramePanelState) => void;
  isCreateMode: boolean;
}) {
  const { user } = useAuthContext();
  const { canvas } = useCanvasContext();
  const { containerRef, offset, zoom } = useCanvasViewContext();
  const { frame: selectedFrame } = useSelectedFrameContext();
  const sourceImage = useCanvasImage(canvas.id);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  const [frameName, setFrameName] = useState(selectedFrame?.name ?? "");
  const [frameBounds, setFrameBounds] = useState<ViewBounds>(
    selectedFrame ?
      normalizeFrameBounds(selectedFrame)
    : fitViewBoundsToFillRatio(
        getCurrentViewBounds({
          canvas,
          containerRef,
          offset,
          zoom,
        }),
        FRAME_FILL_RATIO,
      ),
  );

  const [selectedOwner, setSelectedOwner] = useState<FrameOwnerType>(
    selectedFrame ? selectedFrame.owner.type : FrameOwnerType.User,
  );

  const [selectedGuildId, setSelectedGuildId] = useState<string>(
    selectedFrame && selectedFrame.owner.type === "guild" ?
      selectedFrame.owner.guild.guild_id
    : "",
  );

  const managedGuildEntries = Object.entries(user?.guilds ?? {})
    .filter(([, guild]) => guild.administrator || guild.manageGuild)
    .toSorted(([, a], [, b]) => (b.memberCount ?? 0) - (a.memberCount ?? 0));

  const { data: guildFrames = [] } = useGuildFrames({
    canvasId: canvas.id,
    guildIds: managedGuildEntries.map(([guildId]) => guildId),
  });

  const guildOptions = useMemo<GuildOption[]>(() => {
    const [guildsWithFrames, otherManagedGuilds] = splitGuildsByFramePresence(
      managedGuildEntries,
      guildFrames,
    );

    const withFrames = guildsWithFrames.map(([guildId, guild]) => ({
      guildId,
      guild,
      group: "Servers with frames",
    }));

    const withoutFramesGroup =
      guildsWithFrames.length > 0 ?
        "Other servers you manage"
      : "Servers you manage";

    const withoutFrames = otherManagedGuilds.map(([guildId, guild]) => ({
      guildId,
      guild,
      group: withoutFramesGroup,
    }));

    return [...withFrames, ...withoutFrames];
  }, [managedGuildEntries, guildFrames]);

  const selectedGuildOption =
    guildOptions.find((option) => option.guildId === selectedGuildId) ?? null;

  useEffect(
    function drawSelectedFramePreview() {
      if (!sourceImage) return;

      const previewCanvas = previewCanvasRef.current;
      if (!previewCanvas) return;

      if (frameBounds.width === 0 || frameBounds.height === 0) {
        return;
      }

      drawSourceRectToCanvas(
        previewCanvas,
        sourceImage,
        {
          x: frameBounds.left,
          y: frameBounds.top,
          width: frameBounds.width,
          height: frameBounds.height,
        },
        frameBounds.width,
        frameBounds.height,
      );
    },
    [sourceImage, frameBounds],
  );

  if (!user) {
    // Shouldn't be able to get to this tab without being logged in,
    // but this prevents that at the least
    setActivePanel(FramePanelState.Info);
    return null;
  }

  return (
    <>
      <ScrollBlock>
        <ActionPanelTabBody>
          <EditContainer>
            <Heading>{isCreateMode ? "Create frame" : "Edit frame"}</Heading>
            <TextField
              label="Name"
              variant="outlined"
              value={frameName}
              onChange={(e) => setFrameName(e.target.value)}
            />
            <InputLabel>Owned by</InputLabel>
            <ToggleButtonGroup
              color="primary"
              value={selectedOwner}
              exclusive
              onChange={(_, value) => {
                if (value) {
                  setSelectedOwner(value);
                }
              }}
              disabled={!isCreateMode} // Can't change owner after frame is created
            >
              <ToggleButton value={FrameOwnerType.User}>You</ToggleButton>
              <ToggleButton value={FrameOwnerType.Guild}>Server</ToggleButton>
            </ToggleButtonGroup>
            {selectedOwner === FrameOwnerType.Guild && (
              <Autocomplete
                options={guildOptions}
                value={selectedGuildOption}
                groupBy={(option) => option.group}
                getOptionLabel={(option) => option.guild.name}
                isOptionEqualToValue={(option, value) =>
                  option.guildId === value.guildId
                }
                onChange={(_, value) =>
                  setSelectedGuildId(value?.guildId ?? "")
                }
                disabled={!isCreateMode} // Can't change owner after frame is created
                fullWidth
                renderInput={(params) => (
                  <TextField {...params} label="Server" />
                )}
              />
            )}
          </EditContainer>
          <PreviewContainer>
            <Heading>Preview</Heading>
            {frameBounds ?
              <EditPreviewCanvas
                ref={previewCanvasRef}
                width={Math.max(1, Math.round(frameBounds.width))}
                height={Math.max(1, Math.round(frameBounds.height))}
                style={{
                  aspectRatio: `${Math.max(1, frameBounds.width)} / ${Math.max(1, frameBounds.height)}`,
                }}
                aria-label="Selected frame preview"
              />
            : <p>Select a frame to preview it.</p>}
          </PreviewContainer>
        </ActionPanelTabBody>
      </ScrollBlock>
      <ActionPanelTabBody>
        <DynamicButton
          color={null}
          onAction={() => {
            setActivePanel(FramePanelState.Info);
          }}
        >
          Back
        </DynamicButton>
      </ActionPanelTabBody>
    </>
  );
}
