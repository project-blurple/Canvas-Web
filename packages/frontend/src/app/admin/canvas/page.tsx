"use client";

import type { CanvasInfo } from "@blurple-canvas-web/types";
import { Switch, styled } from "@mui/material";
import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/button";
import CanvasIcon from "@/components/CanvasIcon";
import { CanvasPreviewCard } from "@/components/canvas/CanvasPreviewCard";
import NumberField from "@/components/NumberField";
import { useCanvasContext } from "@/contexts";
import { useCanvasList, useEventInfo, useUpdateCanvasInfo } from "@/hooks";
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
  overflow-y: hidden;
  padding-bottom: 0.5rem;
  width: 100%;

  & > button {
    flex: 0 0 10rem;
    width: 10rem;
  }
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

const StyledButton = styled(Button)`
  background-color: var(--discord-blurple);
  color: var(--discord-legacy-full-white);
  transition-duration: var(--transition-duration-fast);
  transition-property: background-color, color, opacity;
  transition-timing-function: ease;
`;

interface CanvasSettingsFormProps {
  activeCanvas: CanvasInfo;
  onSaved: (canvasId: CanvasInfo["id"]) => Promise<void>;
}

function CanvasSettingsForm({
  activeCanvas,
  onSaved,
}: CanvasSettingsFormProps) {
  const updateCanvasInfo = useUpdateCanvasInfo(activeCanvas.id);

  const [formValues, setFormValues] = useState({
    allColorsGlobal: activeCanvas.allColorsGlobal,
    cooldownLength: activeCanvas.cooldownLength ?? 0,
    isLocked: activeCanvas.isLocked,
    name: activeCanvas.name,
  });

  // Initialize form values when activeCanvas changes
  useEffect(() => {
    setFormValues({
      allColorsGlobal: activeCanvas.allColorsGlobal,
      cooldownLength: activeCanvas.cooldownLength ?? 0,
      isLocked: activeCanvas.isLocked,
      name: activeCanvas.name,
    });
  }, [activeCanvas]);

  const isDirty = useMemo(() => {
    return (
      formValues.isLocked !== activeCanvas.isLocked ||
      formValues.allColorsGlobal !== activeCanvas.allColorsGlobal ||
      formValues.cooldownLength !== activeCanvas.cooldownLength ||
      formValues.name !== activeCanvas.name
    );
  }, [formValues, activeCanvas]);

  function handleIsLockedChange(event: React.ChangeEvent<HTMLInputElement>) {
    setFormValues((previousValues) => ({
      ...previousValues,
      isLocked: event.target.checked,
    }));
  }

  function handleAllColorsGlobalChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    setFormValues((previousValues) => ({
      ...previousValues,
      allColorsGlobal: event.target.checked,
    }));
  }

  function handleCooldownDurationChange(value: number | null) {
    setFormValues((previousValues) => ({
      ...previousValues,
      cooldownLength: value ?? 0,
    }));
  }

  function handleNameChange(event: React.ChangeEvent<HTMLInputElement>) {
    setFormValues((previousValues) => ({
      ...previousValues,
      name: event.target.value,
    }));
  }

  async function handleSaveChanges(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      await updateCanvasInfo.mutateAsync({
        cooldownLength: formValues.cooldownLength,
        isLocked: formValues.isLocked,
        name: formValues.name,
      });
      await onSaved(activeCanvas.id);
    } catch {
      alert("Failed to update canvas info. Please try again.");
    }
  }

  return (
    <CanvasContents onSubmit={handleSaveChanges}>
      <CanvasHeader>
        <CanvasIcon size={20} />
        {activeCanvas.name}
      </CanvasHeader>
      <Table>
        <tbody>
          <tr>
            <td>Name</td>
            <td>
              <TextInput
                type="text"
                value={formValues.name}
                onChange={handleNameChange}
              />
            </td>
          </tr>
          <tr>
            <td>ID</td>
            <td>
              <code>{activeCanvas.id}</code>
            </td>
          </tr>
          <tr>
            <td>Dimensions</td>
            <td>
              <CanvasDimensions>
                {activeCanvas.width}
                <X size={12} />
                {activeCanvas.height}
              </CanvasDimensions>
            </td>
          </tr>
          <tr>
            <td>Cooldown (s)</td>
            <td>
              <NumberField
                min={0}
                onValueChange={handleCooldownDurationChange}
                value={formValues.cooldownLength}
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
                disabled // currently controlled by env rather than db
              />
            </td>
          </tr>
        </tbody>
      </Table>
      <StyledButton
        disabled={!isDirty || updateCanvasInfo.isPending}
        type="submit"
      >
        Save changes
      </StyledButton>
    </CanvasContents>
  );
}

function AdminCanvasTab() {
  const { data: canvases = [], isLoading: canvasListIsLoading } =
    useCanvasList();
  const { canvas: activeCanvas, setCanvas } = useCanvasContext();
  const { data: event, isLoading: eventIsLoading } = useEventInfo();

  const isLoading = canvasListIsLoading || eventIsLoading;

  return (
    <AdminCanvasTabBlock>
      <CanvasInfoWrapper>
        {isLoading ?
          <div>Loading...</div>
        : canvases.length === 0 ?
          <div>No canvases found.</div>
        : <>
            <CanvasList>
              {canvases.map((canvasItem) => (
                <CanvasPreviewCard
                  canvas={canvasItem}
                  currentEventId={event?.id}
                  key={canvasItem.id}
                  onClick={() => setCanvas(canvasItem.id, false)}
                  aria-current={activeCanvas?.id === canvasItem.id}
                />
              ))}
            </CanvasList>
            <CanvasSettingsForm
              activeCanvas={activeCanvas}
              onSaved={async (canvasId) => setCanvas(canvasId, false)}
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
