import { GuildData } from "@blurple-canvas-web/types";
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
import { useEffect, useMemo, useRef, useState } from "react";
import {
  useAuthContext,
  useCanvasContext,
  useSelectedFrameContext,
} from "@/contexts";
import { useGuildFrames } from "@/hooks/queries/useFrame";
import { useCanvasImage } from "@/hooks/useCanvasImage";
import { normalizeFrameBounds } from "@/util";
import { Heading } from "../action-panel/ActionPanel";
import {
  ActionPanelTabBody,
  ScrollBlock,
} from "../action-panel/tabs/ActionPanelTabBody";
import { FramePanelState } from "../action-panel/tabs/FramesTab";
import { DynamicButton } from "../button";
import { drawSourceRectToCanvas, PreviewCanvas } from "./FramePreview";

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
}: {
  setActivePanel: (panel: FramePanelState) => void;
}) {
  const { user } = useAuthContext();
  const { canvas } = useCanvasContext();
  const { frame: selectedFrame } = useSelectedFrameContext();
  const sourceImage = useCanvasImage(canvas.id);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  const isCreateMode = !selectedFrame;

  const [frameName, setFrameName] = useState(selectedFrame?.name ?? "");

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

  const selectedFrameBounds =
    selectedFrame ? normalizeFrameBounds(selectedFrame) : null;

  useEffect(
    function drawSelectedFramePreview() {
      if (!selectedFrame) return;
      if (!sourceImage) return;

      const previewCanvas = previewCanvasRef.current;
      if (!previewCanvas) return;

      const bounds = normalizeFrameBounds(selectedFrame);
      const previewWidth = Math.max(1, Math.round(bounds.width));
      const previewHeight = Math.max(1, Math.round(bounds.height));

      drawSourceRectToCanvas(
        previewCanvas,
        sourceImage,
        {
          x: bounds.left,
          y: bounds.top,
          width: bounds.width,
          height: bounds.height,
        },
        previewWidth,
        previewHeight,
      );
    },
    [selectedFrame, sourceImage],
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
            {selectedFrameBounds ?
              <EditPreviewCanvas
                ref={previewCanvasRef}
                width={Math.max(1, Math.round(selectedFrameBounds.width))}
                height={Math.max(1, Math.round(selectedFrameBounds.height))}
                style={{
                  aspectRatio: `${Math.max(1, selectedFrameBounds.width)} / ${Math.max(1, selectedFrameBounds.height)}`,
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
