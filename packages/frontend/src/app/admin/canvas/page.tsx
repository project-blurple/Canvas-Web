"use client";

import type { CanvasInfo } from "@blurple-canvas-web/types";
import { Switch, styled } from "@mui/material";
import { ListRestart, Plus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/button";
import CanvasIcon from "@/components/CanvasIcon";
import {
  CanvasPreviewCard,
  EventCanvasCard,
} from "@/components/canvas/CanvasPreviewCard";
import NumberField from "@/components/NumberField";
import { useCanvasContext } from "@/contexts";
import { useCanvasList, useEventInfo, useUpdateCanvasInfo } from "@/hooks";
import { useCreateCanvas } from "@/hooks/queries/useCanvasInfo";
import AdminDashboard from "../AdminDashboard";

const AdminCanvasTabBlock = styled("section")`
  display: block;
  max-width: 80rem;
  width: 100%;
`;

const CanvasInfoWrapper = styled("div")`
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
`;

const CanvasList = styled("div")`
  -webkit-overflow-scrolling: touch;
  display: flex;
  flex-wrap: nowrap;
  gap: 0.75rem;
  overflow-x: auto;
  padding-bottom: 0.5rem;
  width: 100%;

  & > button {
    flex-basis: 10rem;
    inline-size: 10rem;
  }
`;

const AddCanvasCard = styled(EventCanvasCard)`
  align-items: center;
  justify-content: center;
`;

const CanvasContents = styled("form")`
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 40rem;
  width: 100%;
`;

const CanvasHeader = styled("h1")`
  align-items: center;
  display: flex;
  font-size: 1.5rem;
  font-weight: 600;
  gap: 0.5rem;
`;

const Table = styled("table")`
  border-collapse: separate;
  border-spacing: 2rem 0.5rem;
`;

const CanvasDimensions = styled("code")`
  align-items: center;
  display: flex;
  flex-direction: row;
  gap: 0.25rem;
`;

const TextInput = styled("input")`
  padding-block: 6px;
  padding-inline: 8px;
`;

const ErrorText = styled("div")`
  color: #e04848;
  font-size: 0.85rem;
  margin-top: 4px;
`;

const SaveStatusText = styled("p")`
  font-size: 0.875rem;
  font-weight: 600;
  min-height: 1.25rem;
`;

const ButtonWrapper = styled("div")`
  display: flex;
  gap: 0.5rem;
`;

const StyledButton = styled(Button)`
  background-color: var(--discord-blurple);
  color: var(--discord-legacy-full-white);
  transition-duration: var(--transition-duration-fast);
  transition-property: background-color, color, opacity;
  transition-timing-function: ease;
`;

const createDefaults = {
  allColorsGlobal: false,
  cooldownDuration: 0,
  height: 1,
  isLocked: true,
  name: "",
  width: 1,
  startCoordinates: [1, 1],
} as const satisfies CanvasSettingsFormValues;

type FormMode = "edit" | "create";

interface CanvasSettingsFormValues extends Pick<
  CanvasInfo,
  | "allColorsGlobal"
  | "cooldownDuration"
  | "height"
  | "isLocked"
  | "name"
  | "width"
  | "startCoordinates"
> {}

function areCanvasSettingsEqual(
  left: CanvasSettingsFormValues,
  right: CanvasSettingsFormValues,
) {
  return (
    left.allColorsGlobal === right.allColorsGlobal &&
    left.cooldownDuration === right.cooldownDuration &&
    left.height === right.height &&
    left.isLocked === right.isLocked &&
    left.name === right.name &&
    left.width === right.width &&
    left.startCoordinates[0] === right.startCoordinates[0] &&
    left.startCoordinates[1] === right.startCoordinates[1]
  );
}

interface CanvasSettingsFormProps {
  activeCanvas: CanvasInfo;
  formValues: CanvasSettingsFormValues;
  isDirty: boolean;
  mode: FormMode;
  saveConfirmation: {
    canvasId: CanvasInfo["id"];
    values: CanvasSettingsFormValues;
  } | null;
  isSaving: boolean;
  onSavingChange: (isSaving: boolean) => void;
  onFormValuesChange: (values: CanvasSettingsFormProps["formValues"]) => void;
  onSaved: (canvasId: CanvasInfo["id"]) => Promise<void>;
}

function CanvasSettingsForm({
  activeCanvas,
  formValues,
  isDirty,
  mode,
  saveConfirmation,
  isSaving,
  onSavingChange,
  onFormValuesChange,
  onSaved,
}: CanvasSettingsFormProps) {
  const updateCanvasInfo = useUpdateCanvasInfo(activeCanvas.id);
  const createCanvas = useCreateCanvas();

  const showSaveConfirmation =
    saveConfirmation !== null &&
    saveConfirmation.canvasId === activeCanvas.id &&
    areCanvasSettingsEqual(formValues, saveConfirmation.values);

  // Initialize form values when activeCanvas changes
  useEffect(() => {
    onFormValuesChange({
      allColorsGlobal: activeCanvas.allColorsGlobal,
      cooldownDuration: activeCanvas.cooldownDuration ?? 0,
      height: activeCanvas.height,
      isLocked: activeCanvas.isLocked,
      name: activeCanvas.name,
      width: activeCanvas.width,
      startCoordinates: activeCanvas.startCoordinates,
    });
  }, [activeCanvas, onFormValuesChange]);

  function handleIsLockedChange(event: React.ChangeEvent<HTMLInputElement>) {
    onFormValuesChange({
      ...formValues,
      isLocked: event.target.checked,
    });
  }

  function handleAllColorsGlobalChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    onFormValuesChange({
      ...formValues,
      allColorsGlobal: event.target.checked,
    });
  }

  function handleCooldownDurationChange(value: number | null) {
    onFormValuesChange({
      ...formValues,
      cooldownDuration: value ?? 0,
    });
  }

  function handleNameChange(event: React.ChangeEvent<HTMLInputElement>) {
    onFormValuesChange({
      ...formValues,
      name: event.target.value,
    });
  }

  function handleWidthChange(value: number | null) {
    onFormValuesChange({
      ...formValues,
      width: value ?? 0,
    });
  }

  function handleHeightChange(value: number | null) {
    onFormValuesChange({
      ...formValues,
      height: value ?? 0,
    });
  }

  function resetForm() {
    if (mode === "create") {
      onFormValuesChange({ ...createDefaults });
    } else {
      onFormValuesChange({
        allColorsGlobal: activeCanvas.allColorsGlobal,
        cooldownDuration: activeCanvas.cooldownDuration ?? 0,
        height: activeCanvas.height,
        isLocked: activeCanvas.isLocked,
        name: activeCanvas.name,
        width: activeCanvas.width,
        startCoordinates: activeCanvas.startCoordinates,
      });
    }
  }

  function isFormInvalid(values = formValues) {
    return values.name.trim().length === 0;
  }

  async function handleSaveChanges(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isFormInvalid()) {
      alert("Name cannot be empty.");
      return;
    }

    onSavingChange(true);

    try {
      if (mode === "create") {
        const response = await createCanvas.mutateAsync({
          allColorsGlobal: formValues.allColorsGlobal,
          cooldownDuration: formValues.cooldownDuration,
          height: formValues.height,
          isLocked: formValues.isLocked,
          name: formValues.name,
          width: formValues.width,
          startCoordinates: formValues.startCoordinates,
        });
        await onSaved(response.data.id);
      } else {
        await updateCanvasInfo.mutateAsync({
          allColorsGlobal: formValues.allColorsGlobal,
          cooldownDuration: formValues.cooldownDuration,
          isLocked: formValues.isLocked,
          name: formValues.name,
        });
        await onSaved(activeCanvas.id);
      }
    } catch {
      alert("Failed to update canvas info. Please try again.");
    } finally {
      onSavingChange(false);
    }
  }

  return (
    <CanvasContents onSubmit={handleSaveChanges}>
      <CanvasHeader>
        <CanvasIcon size={20} />
        {mode === "create" ?
          formValues.name || "New canvas"
        : activeCanvas.name}
      </CanvasHeader>
      <Table>
        <tbody>
          <tr>
            <td>Name</td>
            <td>
              <TextInput
                onChange={handleNameChange}
                type="text"
                value={formValues.name}
              />
              {isFormInvalid() && <ErrorText>Name cannot be empty</ErrorText>}
            </td>
          </tr>
          <tr>
            <td>Dimensions</td>
            <td>
              <CanvasDimensions>
                {mode === "create" ?
                  <NumberField
                    min={1}
                    onValueChange={handleWidthChange}
                    value={formValues.width}
                  />
                : activeCanvas.width}
                <X size={12} />
                {mode === "create" ?
                  <NumberField
                    min={1}
                    onValueChange={handleHeightChange}
                    value={formValues.height}
                  />
                : activeCanvas.height}
              </CanvasDimensions>
            </td>
          </tr>
          <tr>
            <td>Cooldown (s)</td>
            <td>
              <NumberField
                min={0}
                onValueChange={handleCooldownDurationChange}
                value={formValues.cooldownDuration}
              />
            </td>
          </tr>
          <tr>
            <td>Locked</td>
            <td>
              <Switch
                type="checkbox"
                checked={formValues.isLocked}
                onChange={handleIsLockedChange}
              />
            </td>
          </tr>
          <tr>
            <td>Global colors</td>
            <td>
              <Switch
                type="checkbox"
                checked={formValues.allColorsGlobal}
                onChange={handleAllColorsGlobalChange}
              />
            </td>
          </tr>
        </tbody>
      </Table>
      {showSaveConfirmation && (
        // temporary, will be replaced with toast notification in the future
        <SaveStatusText aria-live="polite">Saved</SaveStatusText>
      )}
      <ButtonWrapper>
        <StyledButton
          disabled={!isDirty || isFormInvalid() || isSaving}
          type="submit"
        >
          {mode === "create" ? "Create canvas" : "Save changes"}
        </StyledButton>
        <StyledButton
          disabled={!isDirty || isSaving}
          type="reset"
          onClick={resetForm}
        >
          <ListRestart />
        </StyledButton>
      </ButtonWrapper>
    </CanvasContents>
  );
}

function AdminCanvasTab() {
  const { data: canvases = [], isLoading: canvasListIsLoading } =
    useCanvasList();
  const { canvas: activeCanvas, setCanvas } = useCanvasContext();
  const { data: event, isLoading: eventIsLoading } = useEventInfo();
  const [mode, setMode] = useState<FormMode>("edit");
  const [saveConfirmation, setSaveConfirmation] = useState<{
    canvasId: CanvasInfo["id"];
    values: CanvasSettingsFormValues;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  canvases.sort((a, b) =>
    a.eventId === event?.id ? -1
    : b.eventId === event?.id ? 1
    : 0,
  );

  const [formValues, setFormValues] = useState<CanvasSettingsFormValues>({
    allColorsGlobal:
      activeCanvas?.allColorsGlobal ?? createDefaults.allColorsGlobal,
    cooldownDuration:
      activeCanvas?.cooldownDuration ?? createDefaults.cooldownDuration,
    height: activeCanvas?.height ?? createDefaults.height,
    isLocked: activeCanvas?.isLocked ?? createDefaults.isLocked,
    name: activeCanvas?.name ?? createDefaults.name,
    width: activeCanvas?.width ?? createDefaults.width,
    startCoordinates:
      activeCanvas?.startCoordinates ?? createDefaults.startCoordinates,
  });

  useEffect(() => {
    if (mode === "create") {
      setFormValues({ ...createDefaults });
    } else if (activeCanvas) {
      setFormValues({
        allColorsGlobal:
          activeCanvas.allColorsGlobal ?? createDefaults.allColorsGlobal,
        cooldownDuration:
          activeCanvas.cooldownDuration ?? createDefaults.cooldownDuration,
        height: activeCanvas.height ?? createDefaults.height,
        isLocked: activeCanvas.isLocked ?? createDefaults.isLocked,
        name: activeCanvas.name ?? createDefaults.name,
        width: activeCanvas.width ?? createDefaults.width,
        startCoordinates:
          activeCanvas.startCoordinates ?? createDefaults.startCoordinates,
      });
    }
  }, [mode, activeCanvas]);

  useEffect(() => {
    if (
      saveConfirmation !== null &&
      activeCanvas &&
      saveConfirmation.canvasId !== activeCanvas.id
    ) {
      setSaveConfirmation(null);
    }
  }, [activeCanvas, saveConfirmation]);
  const isDirty = useMemo(() => {
    if (mode === "create") {
      return (
        formValues.isLocked !== createDefaults.isLocked ||
        formValues.allColorsGlobal !== createDefaults.allColorsGlobal ||
        formValues.cooldownDuration !== createDefaults.cooldownDuration ||
        formValues.name !== createDefaults.name ||
        formValues.width !== createDefaults.width ||
        formValues.height !== createDefaults.height
      );
    }
    if (!activeCanvas) return false;
    return (
      formValues.isLocked !== activeCanvas.isLocked ||
      formValues.allColorsGlobal !== activeCanvas.allColorsGlobal ||
      (formValues.cooldownDuration !== activeCanvas.cooldownDuration &&
        activeCanvas.cooldownDuration !== null) ||
      formValues.name !== activeCanvas.name ||
      formValues.width !== activeCanvas.width ||
      formValues.height !== activeCanvas.height
    );
  }, [formValues, activeCanvas, mode]);

  const isLoading = canvasListIsLoading || eventIsLoading;
  const isCanvasSelectionDisabled = isDirty || isSaving;

  return (
    <AdminCanvasTabBlock>
      <CanvasInfoWrapper>
        {isLoading ?
          <CanvasIcon
            loading
            size={64}
            style={{
              color: "var(--discord-blurple)",
              margin: "auto",
              opacity: 0.5,
            }}
          />
        : canvases.length === 0 ?
          <div>No canvases found.</div>
        : <>
            <CanvasList>
              <AddCanvasCard
                disabled={isCanvasSelectionDisabled}
                onClick={() => setMode("create")}
                aria-current={mode === "create"}
              >
                <Plus />
              </AddCanvasCard>
              {canvases.map((canvasItem) => (
                <CanvasPreviewCard
                  canvas={canvasItem}
                  currentEventId={event?.id}
                  key={canvasItem.id}
                  disabled={isCanvasSelectionDisabled}
                  onClick={() => {
                    setCanvas(canvasItem.id, false);
                    setMode("edit");
                  }}
                  aria-current={
                    activeCanvas?.id === canvasItem.id && mode === "edit"
                  }
                />
              ))}
            </CanvasList>
            <CanvasSettingsForm
              activeCanvas={activeCanvas}
              formValues={formValues}
              isDirty={isDirty}
              mode={mode}
              saveConfirmation={saveConfirmation}
              isSaving={isSaving}
              onSavingChange={setIsSaving}
              onFormValuesChange={setFormValues}
              onSaved={async (canvasId) => {
                setSaveConfirmation({
                  canvasId,
                  values: formValues,
                });
                await setCanvas(canvasId, false);
              }}
            />
          </>
        }
      </CanvasInfoWrapper>
    </AdminCanvasTabBlock>
  );
}

export default function CanvasAdminPage() {
  return (
    <AdminDashboard>
      <AdminCanvasTab />
    </AdminDashboard>
  );
}
