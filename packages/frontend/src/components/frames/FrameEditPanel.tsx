import { GuildData } from "@blurple-canvas-web/types";
import {
  FrameOwnerType,
  GuildOwnedFrame,
} from "@blurple-canvas-web/types/src/frame";
import {
  FormControl,
  InputLabel,
  ListSubheader,
  MenuItem,
  Select,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { useMemo, useState } from "react";
import {
  useAuthContext,
  useCanvasContext,
  useSelectedFrameContext,
} from "@/contexts";
import { useGuildFrames } from "@/hooks/queries/useFrame";
import { Heading } from "../action-panel/ActionPanel";
import {
  ActionPanelTabBody,
  ScrollBlock,
} from "../action-panel/tabs/ActionPanelTabBody";
import { FramePanelState } from "../action-panel/tabs/FramesTab";
import { DynamicButton } from "../button";

const EditContainer = styled("div")`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const SelectMenuProps = {};

type GuildEntry = [string, GuildData];

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

  const [guildsWithFrames, otherManagedGuilds] = useMemo(
    () => splitGuildsByFramePresence(managedGuildEntries, guildFrames),
    [managedGuildEntries, guildFrames],
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
            <Heading>{selectedFrame ? "Edit frame" : "Create frame"}</Heading>
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
            >
              <ToggleButton value={FrameOwnerType.User}>You</ToggleButton>
              <ToggleButton value={FrameOwnerType.Guild}>Server</ToggleButton>
            </ToggleButtonGroup>
            {selectedOwner === FrameOwnerType.Guild && (
              <FormControl fullWidth>
                <InputLabel>Server</InputLabel>
                <Select
                  value={selectedGuildId}
                  label="Server"
                  onChange={(e) => setSelectedGuildId(e.target.value as string)}
                  MenuProps={SelectMenuProps}
                >
                  {guildsWithFrames.length > 0 && (
                    <ListSubheader>Servers with frames</ListSubheader>
                  )}
                  {guildsWithFrames.map(([guildId, guild]) => (
                    <MenuItem key={guildId} value={guildId}>
                      {guild.name}
                    </MenuItem>
                  ))}

                  {otherManagedGuilds.length > 0 && (
                    <ListSubheader>
                      {guildsWithFrames.length > 0 ?
                        "Other servers you manage"
                      : "Servers you manage"}
                    </ListSubheader>
                  )}
                  {otherManagedGuilds.map(([guildId, guild]) => (
                    <MenuItem key={guildId} value={guildId}>
                      {guild.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </EditContainer>
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
