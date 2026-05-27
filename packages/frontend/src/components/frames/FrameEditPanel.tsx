import {
  FrameOwnerType,
  type GuildData,
  type GuildOwnedFrame,
} from "@blurple-canvas-web/types";
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
import { FramePanelMode } from "../action-panel/tabs/FramesTab";
import BoundsSelect from "../BoundsSelect/BoundsSelect";
import { BasicButton, DestructiveButton, DynamicButton } from "../button";
import Dialog from "../Dialog";
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

const OwnerTypeOptions = styled("div")`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const OwnerTypeOption = styled("label")`
  align-items: center;
  background-color: var(--discord-legacy-not-quite-black);
  border-radius: 8px;
  border: var(--card-border);
  cursor: pointer;
  display: inline-flex;
  font-size: 0.875rem;
  gap: 0.5rem;
  padding-block: 0.5rem;
  padding-inline: 0.75rem;
  user-select: none;

  input {
    margin: 0;
  }
`;

const TextInput = styled("input")`
  border: var(--card-border);
  padding-block: 6px;
  padding-inline: 8px;
  background-color: var(--discord-legacy-not-quite-black);
`;

const Select = styled("select")`
  background-color: var(--discord-legacy-not-quite-black);
  border-radius: 8px;
  border: var(--card-border);
  color: inherit;
  padding-block: 6px;
  padding-inline: 8px;
  width: 100%;
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

const StyledDialog = styled(Dialog)`
  gap: 0.5rem;

  h2 {
    color: var(--discord-white);
    font-size: 1.5rem;
    font-weight: 600;
  }

  &[open] {
    display: flex;
    flex-direction: column;
  }
`;

const DialogButtons = styled("div")`
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  margin-top: 1rem;
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
    selectedFrame ? selectedFrame.owner.type : FrameOwnerType.User,
  );
  const initialGuildIdRef = useRef(
    selectedFrame && selectedFrame.owner.type === FrameOwnerType.Guild ?
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
    selectedFrame?.owner.type ?? FrameOwnerType.User,
  );

  const [selectedGuildId, setSelectedGuildId] = useState<string>(
    selectedFrame?.owner.type === FrameOwnerType.Guild ?
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

  const groupedGuildOptions = useMemo(() => {
    return guildOptions.reduce<
      Array<{ group: string; options: GuildOption[] }>
    >((groups, option) => {
      const lastGroup = groups[groups.length - 1];
      if (lastGroup?.group === option.group) {
        lastGroup.options.push(option);
        return groups;
      }

      groups.push({ group: option.group, options: [option] });
      return groups;
    }, []);
  }, [guildOptions]);

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
      if (!user) {
        throw new Error("Must be logged in to create a frame");
      }

      const requestUrl = `${config.apiUrl}/api/v1/frame`;

      const owner =
        ownerType === FrameOwnerType.Guild ?
          { type: FrameOwnerType.Guild, id: guildId }
        : { type: FrameOwnerType.User, id: user.id };

      const body = {
        canvasId: canvas.id,
        name,
        owner,
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
    selectedOwner === FrameOwnerType.User ?
      userHasReachedMaxFrames
    : guildHasReachedMaxFrames?.[selectedGuildId];

  return (
    <>
      <form onSubmit={handleFormSubmit}>
        <FullWidthScrollView>
          <ActionPanelTabBody>
            <EditContainer>
              <ActionPanelPrimitives.SectionHeading>
                {isCreateMode ? "Create frame" : "Edit frame"}
              </ActionPanelPrimitives.SectionHeading>
              <InputWrapper>
                <InputLabel htmlFor="frameName">Name</InputLabel>
                <TextInput
                  id="frameName"
                  type="text"
                  onChange={(e) => setFrameName(e.target.value)}
                  required
                  defaultValue={frameName}
                  name="frameName"
                />
              </InputWrapper>

              <InputWrapper>
                <InputLabel as="div">Owned by</InputLabel>
                <OwnerTypeOptions role="radiogroup" aria-label="Owned by">
                  <OwnerTypeOption htmlFor="owner-user">
                    <input
                      type="radio"
                      id="owner-user"
                      name="ownerType"
                      value="user"
                      checked={selectedOwner === FrameOwnerType.User}
                      onChange={() => setSelectedOwner(FrameOwnerType.User)}
                      disabled={!isCreateMode} // Can't change owner after frame is created
                    />
                    <span>You</span>
                  </OwnerTypeOption>
                  <OwnerTypeOption htmlFor="owner-guild">
                    <input
                      type="radio"
                      id="owner-guild"
                      name="ownerType"
                      value="guild"
                      checked={selectedOwner === FrameOwnerType.Guild}
                      onChange={() => setSelectedOwner(FrameOwnerType.Guild)}
                      disabled={!isCreateMode} // Can't change owner after frame is created
                    />
                    <span>Server</span>
                  </OwnerTypeOption>
                </OwnerTypeOptions>
                {selectedOwner === FrameOwnerType.Guild && (
                  <Select
                    id="guildId"
                    name="guildId"
                    value={selectedGuildId}
                    onChange={(event) => setSelectedGuildId(event.target.value)}
                    disabled={!isCreateMode} // Can't change owner after frame is created
                    required
                  >
                    <option value="" disabled>
                      Select a server
                    </option>
                    {groupedGuildOptions.map((group) => (
                      <optgroup key={group.group} label={group.group}>
                        {group.options.map((option) => (
                          <option key={option.guildId} value={option.guildId}>
                            {option.guild.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </Select>
                )}
              </InputWrapper>
              {frameBounds && (
                <InputWrapper>
                  <InputLabel as="div">Frame bounds</InputLabel>
                  <BoundsSelect
                    canvas={canvas}
                    selectedBounds={frameBounds}
                    setSelectedBounds={setFrameBounds}
                    showFrameButton={false}
                  />
                </InputWrapper>
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
                  disabled={
                    !frameName ||
                    !frameBounds ||
                    !isDirty ||
                    saveFrameMutation.isPending ||
                    deleteFrameMutation.isPending
                  }
                >
                  Save
                </DynamicButton>
                <DestructiveButton
                  onClick={handleDeleteButtonAction}
                  type="button"
                  disabled={
                    deleteFrameMutation.isPending || saveFrameMutation.isPending
                  }
                >
                  Delete
                </DestructiveButton>
              </>
            : <BasicButton
                type="submit"
                disabled={
                  !frameName ||
                  !frameBounds ||
                  (!selectedGuildId && selectedOwner === "guild") ||
                  isAtMaxFrames || // Only restrict when creating, not when editing
                  createFrameMutation.isPending
                }
              >
                {isAtMaxFrames ? "Maximum frames created" : "Create"}
              </BasicButton>
            }
          </ButtonRow>
          <BasicButton
            onClick={handleBackAction}
            type="button"
            disabled={
              saveFrameMutation.isPending ||
              deleteFrameMutation.isPending ||
              createFrameMutation.isPending
            }
          >
            Back
          </BasicButton>
        </ActionPanelTabBody>
      </form>
      <StyledDialog
        open={isBackConfirmOpen}
        onRequestClose={() => setIsBackConfirmOpen(false)}
        aria-labelledby="frame-edit-discard-dialog-title"
        aria-describedby="frame-edit-discard-dialog-description"
      >
        <h2 id="frame-edit-discard-dialog-title">Discard changes?</h2>
        <p id="frame-edit-discard-dialog-description">
          You have unsaved changes to this frame. Are you sure you want to go
          back and discard them?
        </p>
        <DialogButtons>
          <BasicButton
            type="button"
            onClick={() => setIsBackConfirmOpen(false)}
          >
            Keep editing
          </BasicButton>
          <DestructiveButton
            type="button"
            onClick={() => {
              setIsBackConfirmOpen(false);
              closeEditor();
            }}
          >
            Discard
          </DestructiveButton>
        </DialogButtons>
      </StyledDialog>
      <StyledDialog
        open={isDeleteConfirmOpen}
        onRequestClose={() => setIsDeleteConfirmOpen(false)}
        aria-labelledby="frame-edit-delete-dialog-title"
        aria-describedby="frame-edit-delete-dialog-description"
      >
        <h2 id="frame-edit-delete-dialog-title">Delete frame?</h2>
        <p id="frame-edit-delete-dialog-description">
          This will permanently delete this frame. Are you sure you want to
          continue?
        </p>
        <DialogButtons>
          <BasicButton
            type="button"
            onClick={() => setIsDeleteConfirmOpen(false)}
          >
            Cancel
          </BasicButton>
          <DestructiveButton type="button" onClick={handleDeleteAction}>
            Delete
          </DestructiveButton>
        </DialogButtons>
      </StyledDialog>
    </>
  );
}
