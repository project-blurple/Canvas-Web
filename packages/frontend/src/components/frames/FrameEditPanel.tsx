import type {
  FrameOwnerType,
  GuildData,
  GuildOwnedFrame,
} from "@blurple-canvas-web/types";
import {
  Autocomplete,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import {
  type Dispatch,
  type SetStateAction,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import config from "@/config/clientConfig";
import {
  useAuthContext,
  useCanvasContext,
  useSelectedBoundsContext,
  useSelectedFrameContext,
} from "@/contexts";
import { useGuildFrames, useUserFrames } from "@/hooks/queries/useFrame";
import { useCanvasImage } from "@/hooks/useCanvasImage";
import {
  hexStringToPixelColor,
  normalizeFrameBounds,
  type ViewBounds,
} from "@/util";
import ActionPanelPrimitives from "../action-panel/primitives";
import {
  ActionPanelTabBody,
  FullWidthScrollView,
} from "../action-panel/tabs/ActionPanelTabBody";
import CoordinatesCard from "../action-panel/tabs/CoordinatesCard";
import { FramePanelMode } from "../action-panel/tabs/FramesTab";
import { DynamicButton } from "../button";
import { addPoints, tupleToPoint } from "../canvas/point";
import { drawSourceRectToCanvas, PreviewCanvas } from "./FramePreview";

const EditContainer = styled("div")`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const InputWrapper = styled("div")`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const InputLabel = styled("label")`
  opacity: 0.75;
  font-size: 0.875rem;
`;

const TextInput = styled("input")`
  border: var(--card-border);
  padding-block: 6px;
  padding-inline: 8px;
  background-color: var(--discord-legacy-not-quite-black);
`;

const PreviewContainer = styled("div")`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const EditPreviewCanvas = styled(PreviewCanvas)`
  height: unset;
`;

const ButtonRow = styled("div")`
  display: flex;
  gap: 0.5rem;
  inline-size: 100%;
  padding: 0;

  > * {
    flex: 1 1 0;
    min-width: 0;
  }
`;

type GuildEntry = [string, GuildData];
interface GuildOption {
  guildId: string;
  guild: GuildData;
  group: string;
}

function areBoundsEqual(a: ViewBounds | null, b: ViewBounds | null) {
  if (!a && !b) return true;
  if (!a || !b) return false;

  return (
    a.left === b.left &&
    a.top === b.top &&
    a.right === b.right &&
    a.bottom === b.bottom
  );
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

export type Mode = "create" | "edit";

export default function FrameEditPanel({
  setActivePanel,
  mode,
}: {
  setActivePanel: Dispatch<SetStateAction<FramePanelMode>>;
  mode: Mode;
}) {
  const isCreateMode = mode === "create";
  const { user } = useAuthContext();
  const { canvas } = useCanvasContext();
  const queryClient = useQueryClient();
  const {
    resetSelectedBounds,
    setCanEdit,
    selectedBounds: frameBounds,
    setSelectedBounds: setFrameBounds,
    setBoundsToCurrentView,
    setShowSelectedBounds,
  } = useSelectedBoundsContext();
  const { frame: selectedFrame, setFrame: setSelectedFrame } =
    useSelectedFrameContext();
  const sourceImage = useCanvasImage(canvas.id);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  const [frameId] = useState<string | null>(
    selectedFrame ? selectedFrame.id : null,
  );
  const [frameName, setFrameName] = useState(selectedFrame?.name ?? "");
  const [isBackConfirmOpen, setIsBackConfirmOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDirtyTrackingReady, setIsDirtyTrackingReady] = useState(false);

  const initialFrameNameRef = useRef(selectedFrame?.name ?? "");
  const initialOwnerRef = useRef<FrameOwnerType>(
    selectedFrame ? selectedFrame.owner.type : "user",
  );
  const initialGuildIdRef = useRef(
    selectedFrame && selectedFrame.owner.type === "guild" ?
      selectedFrame.owner.guild.guild_id
    : "",
  );
  const initialBoundsRef = useRef<ViewBounds | null>(null);

  const didInitBoundsRef = useRef(false);

  useEffect(
    function initialiseBoundsFromCurrentView() {
      if (didInitBoundsRef.current) return;

      if (selectedFrame) {
        setFrameBounds(normalizeFrameBounds(selectedFrame));
      } else {
        setBoundsToCurrentView(0.75);
      }

      setCanEdit(true);
      setShowSelectedBounds(true);

      didInitBoundsRef.current = true;
    },
    [
      selectedFrame,
      setFrameBounds,
      setBoundsToCurrentView,
      setCanEdit,
      setShowSelectedBounds,
    ],
  );

  const [selectedOwner, setSelectedOwner] = useState<FrameOwnerType>(
    selectedFrame?.owner.type ?? "user",
  );

  const [selectedGuildId, setSelectedGuildId] = useState<string>(
    selectedFrame?.owner.type === "guild" ?
      selectedFrame.owner.guild.guild_id
    : "",
  );

  useEffect(() => {
    if (!frameBounds) return;
    if (isDirtyTrackingReady) return;

    initialFrameNameRef.current = frameName;
    initialOwnerRef.current = selectedOwner;
    initialGuildIdRef.current = selectedGuildId;
    initialBoundsRef.current = {
      left: frameBounds.left,
      top: frameBounds.top,
      right: frameBounds.right,
      bottom: frameBounds.bottom,
      width: frameBounds.width,
      height: frameBounds.height,
    };
    setIsDirtyTrackingReady(true);
  }, [
    frameBounds,
    frameName,
    selectedOwner,
    selectedGuildId,
    isDirtyTrackingReady,
  ]);

  const { data: userFramesResponse } = useUserFrames({
    canvasId: canvas.id,
    userId: user?.id,
  });
  const userHasReachedMaxFrames = userFramesResponse?.hasReachedMaxFrames;

  const managedGuildEntries = Object.entries(user?.guilds ?? {})
    .filter(([, guild]) => guild.administrator || guild.manageGuild)
    .toSorted(([, a], [, b]) => (b.memberCount ?? 0) - (a.memberCount ?? 0));

  const { data: guildFramesResponse } = useGuildFrames({
    canvasId: canvas.id,
    guildIds: managedGuildEntries.map(([guildId]) => guildId),
  });

  const guildFrames = guildFramesResponse?.data ?? [];
  const guildHasReachedMaxFrames = guildFramesResponse?.hasReachedMaxFrames;

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

  const isDirty = useMemo(() => {
    if (!isDirtyTrackingReady) return false;

    const nameChanged = frameName !== initialFrameNameRef.current;
    const ownerChanged = selectedOwner !== initialOwnerRef.current;
    const guildChanged = selectedGuildId !== initialGuildIdRef.current;
    const boundsChanged = !areBoundsEqual(
      frameBounds,
      initialBoundsRef.current,
    );

    return nameChanged || ownerChanged || guildChanged || boundsChanged;
  }, [
    isDirtyTrackingReady,
    frameName,
    selectedOwner,
    selectedGuildId,
    frameBounds,
  ]);

  const closeEditor = () => {
    setActivePanel(FramePanelMode.Info);
    resetSelectedBounds();
  };

  const invalidateFrameQueries = async () => {
    await Promise.all([
      ...(user ?
        [
          queryClient.invalidateQueries({
            queryKey: ["frame", "user", canvas.id, user.id],
          }),
        ]
      : []),
      queryClient.invalidateQueries({
        queryKey: ["frame", "guild", canvas.id],
      }),
    ]);
  };

  const saveFrameMutation = useMutation({
    mutationFn: async ({
      id,
      name,
      bounds,
    }: {
      id: string;
      name: string;
      bounds: ViewBounds;
    }) => {
      const requestUrl = `${config.apiUrl}/api/v1/frame/${encodeURIComponent(id)}/edit`;

      const body = {
        name: name,
        x0: bounds.left,
        y0: bounds.top,
        x1: bounds.right,
        y1: bounds.bottom,
      };

      await axios.put(requestUrl, body, {
        withCredentials: true,
      });
    },
    onSuccess: invalidateFrameQueries,
  });

  const deleteFrameMutation = useMutation({
    mutationFn: async (id: string) => {
      const requestUrl = `${config.apiUrl}/api/v1/frame/${encodeURIComponent(id)}/delete`;

      await axios.delete(requestUrl, {
        withCredentials: true,
      });
    },
    onSuccess: invalidateFrameQueries,
  });

  const createFrameMutation = useMutation({
    mutationFn: async ({
      name,
      ownerType,
      guildId,
    }: {
      name: string;
      ownerType: FrameOwnerType;
      guildId: string;
    }) => {
      const requestUrl = `${config.apiUrl}/api/v1/frame`;

      const body = {
        canvasId: canvas.id,
        name,
        ownerId: ownerType === "user" ? user?.id : guildId,
        isGuildOwned: ownerType === "guild",
        x0: frameBounds?.left ?? 0,
        y0: frameBounds?.top ?? 0,
        x1: frameBounds ? frameBounds.right : canvas.width,
        y1: frameBounds ? frameBounds.bottom : canvas.height,
      };

      await axios.post(requestUrl, body, {
        withCredentials: true,
      });
    },
    onSuccess: invalidateFrameQueries,
  });

  const handleBackAction = () => {
    if (isDirty) {
      setIsBackConfirmOpen(true);
      return;
    }

    closeEditor();
  };

  const handleDeleteButtonAction = () => {
    setIsDeleteConfirmOpen(true);
  };

  const handleDeleteAction = async () => {
    setIsDeleteConfirmOpen(false);

    try {
      if (!frameId) return;

      await deleteFrameMutation.mutateAsync(frameId);
    } catch (e) {
      console.error(e);
      if ((e as { response?: { status?: number } }).response?.status === 401) {
        alert("Your session has expired. Please log in again.");
        return;
      }

      alert("Failed to delete frame");
    } finally {
      setSelectedFrame(null);
      closeEditor();
    }
  };

  const handleFormSubmit: React.SubmitEventHandler<HTMLFormElement> = async (
    event,
  ) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const submittedName = String(formData.get("frameName") ?? "").trim();
    const submittedOwner = String(formData.get("ownerType") ?? "user");
    const submittedGuildId = String(formData.get("guildId") ?? "");

    if (isCreateMode) {
      try {
        await createFrameMutation.mutateAsync({
          name: submittedName,
          ownerType: submittedOwner as FrameOwnerType,
          guildId: submittedGuildId,
        });
      } catch (e) {
        console.error(e);
        if (
          (e as { response?: { status?: number } }).response?.status === 401
        ) {
          alert("Your session has expired. Please log in again.");
          return;
        }

        alert("Failed to create frame");
        return;
      }

      closeEditor();
      return;
    }

    try {
      if (!frameId || !frameBounds) return;

      await saveFrameMutation.mutateAsync({
        id: frameId,
        name: submittedName,
        bounds: frameBounds,
      });
    } catch (e) {
      console.error(e);
      if ((e as { response?: { status?: number } }).response?.status === 401) {
        alert("Your session has expired. Please log in again.");
        return;
      }

      alert("Failed to save frame changes");
      return;
    }

    setSelectedFrame(null);
    closeEditor();
  };

  useEffect(
    function drawSelectedFramePreview() {
      if (!sourceImage) return;

      const previewCanvas = previewCanvasRef.current;
      if (!previewCanvas) return;

      if (!frameBounds || frameBounds.width === 0 || frameBounds.height === 0) {
        return;
      }

      const timeoutId = window.setTimeout(() => {
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
        // Minor debouncing to avoid redrawing on every single pixel change when resizing frame
      }, 50);

      return () => window.clearTimeout(timeoutId);
    },
    [sourceImage, frameBounds],
  );

  useEffect(() => {
    if (!user) {
      // Shouldn't be able to get to this tab without being logged in,
      // but this prevents that at the least
      setActivePanel(FramePanelMode.Info);
      resetSelectedBounds();
    }
  }, [user, setActivePanel, resetSelectedBounds]);

  const isAtMaxFrames =
    selectedOwner === "user" ?
      userHasReachedMaxFrames
    : guildHasReachedMaxFrames?.[selectedGuildId];

  return (
    <>
      <form onSubmit={handleFormSubmit}>
        <input type="hidden" name="ownerType" value={selectedOwner} />
        <input type="hidden" name="guildId" value={selectedGuildId} />
        <FullWidthScrollView>
          <ActionPanelTabBody>
            <EditContainer>
              <ActionPanelPrimitives.SectionHeading>
                {isCreateMode ? "Create frame" : "Edit frame"}
              </ActionPanelPrimitives.SectionHeading>
              <InputWrapper>
                <InputLabel htmlFor="frameName">Name</InputLabel>
                <TextInput
                  type="text"
                  onChange={(e) => setFrameName(e.target.value)}
                  required
                  defaultValue={frameName}
                  name="frameName"
                />
              </InputWrapper>

              <InputWrapper>
                <InputLabel>Owned by</InputLabel>
                <ToggleButtonGroup
                  color="primary"
                  defaultValue={selectedOwner}
                  exclusive
                  onChange={(_, value) => {
                    if (value) {
                      setSelectedOwner(value);
                    }
                  }}
                  disabled={!isCreateMode} // Can't change owner after frame is created
                >
                  <ToggleButton value="user">You</ToggleButton>
                  <ToggleButton value="guild">Server</ToggleButton>
                </ToggleButtonGroup>
                {selectedOwner === "guild" && (
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
              </InputWrapper>
              {frameBounds && (
                <>
                  <CoordinatesCard
                    coordinates={addPoints(
                      { x: frameBounds.left, y: frameBounds.top },
                      tupleToPoint(canvas.startCoordinates),
                    )}
                  />
                  <CoordinatesCard
                    coordinates={addPoints(
                      { x: frameBounds.right - 1, y: frameBounds.bottom - 1 },
                      tupleToPoint(canvas.startCoordinates),
                    )}
                  />
                </>
              )}
            </EditContainer>
            <PreviewContainer>
              <ActionPanelPrimitives.SectionHeading>
                Preview
              </ActionPanelPrimitives.SectionHeading>
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
        </FullWidthScrollView>
        <ActionPanelTabBody>
          <ButtonRow>
            {!isCreateMode ?
              <>
                <DynamicButton
                  color={hexStringToPixelColor(frameId)}
                  type="submit"
                  disabled={!frameName || !frameBounds || !isDirty}
                >
                  Save
                </DynamicButton>
                <DynamicButton
                  color={hexStringToPixelColor(frameId)}
                  onAction={handleDeleteButtonAction}
                  type="button"
                >
                  Delete
                </DynamicButton>
              </>
            : <DynamicButton
                color={hexStringToPixelColor(frameId)}
                type="submit"
                disabled={
                  !frameName ||
                  !frameBounds ||
                  (!selectedGuildId && selectedOwner === "guild") ||
                  isAtMaxFrames // Only restrict when creating, not when editing
                }
              >
                {isAtMaxFrames ? "Maximum frames created" : "Create"}
              </DynamicButton>
            }
          </ButtonRow>
          <DynamicButton color={null} onAction={handleBackAction} type="button">
            Back
          </DynamicButton>
        </ActionPanelTabBody>
      </form>
      <Dialog
        open={isBackConfirmOpen}
        onClose={() => setIsBackConfirmOpen(false)}
        aria-labelledby="frame-edit-discard-dialog-title"
        aria-describedby="frame-edit-discard-dialog-description"
      >
        <DialogTitle id="frame-edit-discard-dialog-title">
          Discard changes?
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="frame-edit-discard-dialog-description">
            You have unsaved changes to this frame. Are you sure you want to go
            back and discard them?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <DynamicButton
            color={null}
            onAction={() => setIsBackConfirmOpen(false)}
          >
            Keep editing
          </DynamicButton>
          <DynamicButton
            color={null}
            onAction={() => {
              setIsBackConfirmOpen(false);
              closeEditor();
            }}
          >
            Discard
          </DynamicButton>
        </DialogActions>
      </Dialog>
      <Dialog
        open={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        aria-labelledby="frame-edit-delete-dialog-title"
        aria-describedby="frame-edit-delete-dialog-description"
      >
        <DialogTitle id="frame-edit-delete-dialog-title">
          Delete frame?
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="frame-edit-delete-dialog-description">
            This will permanently delete this frame. Are you sure you want to
            continue?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <DynamicButton
            color={null}
            onAction={() => setIsDeleteConfirmOpen(false)}
          >
            Cancel
          </DynamicButton>
          <DynamicButton
            color={hexStringToPixelColor(frameId)}
            onAction={handleDeleteAction}
          >
            Delete
          </DynamicButton>
        </DialogActions>
      </Dialog>
    </>
  );
}
