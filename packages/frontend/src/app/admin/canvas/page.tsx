"use client";

import type { CanvasInfo } from "@blurple-canvas-web/types";
import { Switch, styled } from "@mui/material";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
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
  flex-direction: column;
  font-size: 1.5rem;
  font-weight: 600;
  gap: 0.25rem;

  span {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
`;

const CanvasId = styled("code")`
  opacity: 0.75;
  font-size: 0.875rem;
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

  const [name, setName] = useState(activeCanvas.name);
  const [isLocked, setIsLocked] = useState(activeCanvas.isLocked);
  const [allColorsGlobal, setAllColorsGlobal] = useState(
    activeCanvas.allColorsGlobal,
  );
  const [cooldownLength, setCooldownLength] = useState(
    activeCanvas.cooldownLength ?? 0,
  );
  const [isDirty, setIsDirty] = useState(false);

  // Initialize form values when activeCanvas changes
  useEffect(() => {
    setIsLocked(activeCanvas.isLocked);
    setAllColorsGlobal(activeCanvas.allColorsGlobal);
    setCooldownLength(activeCanvas.cooldownLength ?? 0);
    setName(activeCanvas.name);
    setIsDirty(false);
  }, [activeCanvas]);

  function checkIfDirty(
    checkedIsLocked: boolean,
    checkedAllColorsGlobal: boolean,
    checkedCooldownLength: number,
    checkedName: string,
  ) {
    return (
      checkedIsLocked !== activeCanvas.isLocked ||
      checkedAllColorsGlobal !== activeCanvas.allColorsGlobal ||
      checkedCooldownLength !== activeCanvas.cooldownLength ||
      checkedName !== activeCanvas.name
    );
  }

  function handleIsLockedChange(event: React.ChangeEvent<HTMLInputElement>) {
    const newIsLocked = event.target.checked;
    setIsLocked(newIsLocked);
    setIsDirty(
      checkIfDirty(newIsLocked, allColorsGlobal, cooldownLength, name),
    );
  }

  function handleAllColorsGlobalChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const newAllColorsGlobal = event.target.checked;
    setAllColorsGlobal(newAllColorsGlobal);
    setIsDirty(
      checkIfDirty(isLocked, newAllColorsGlobal, cooldownLength, name),
    );
  }

  function handleCooldownDurationChange(value: number | null) {
    const newCooldownLength = value ?? 0;
    setCooldownLength(newCooldownLength);
    setIsDirty(
      checkIfDirty(isLocked, allColorsGlobal, newCooldownLength, name),
    );
  }

  function handleNameChange(event: React.ChangeEvent<HTMLInputElement>) {
    const newName = event.target.value;
    setName(newName);
    setIsDirty(
      checkIfDirty(isLocked, allColorsGlobal, cooldownLength, newName),
    );
  }

  async function handleSaveChanges(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      await updateCanvasInfo.mutateAsync({
        cooldownLength,
        isLocked,
        name,
      });
      await onSaved(activeCanvas.id);
    } catch {
      alert("Failed to update canvas info. Please try again.");
    }
  }

  return (
    <CanvasContents onSubmit={handleSaveChanges}>
      <CanvasHeader>
        <span>
          <CanvasIcon size={20} />
          {activeCanvas.name}
        </span>
        <CanvasId>ID: {activeCanvas.id}</CanvasId>
      </CanvasHeader>
      <table>
        <tbody>
          <tr>
            <td>Name</td>
            <td>
              <TextInput type="text" value={name} onChange={handleNameChange} />
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
                value={cooldownLength}
              />
            </td>
          </tr>
          <tr>
            <td>Locked</td>
            <td>
              <Switch
                type="checkbox"
                checked={isLocked}
                onChange={handleIsLockedChange}
              />
            </td>
          </tr>
          <tr>
            <td>Partner colors global</td>
            <td>
              <Switch
                type="checkbox"
                checked={allColorsGlobal}
                onChange={handleAllColorsGlobalChange}
                disabled // currently controlled by env rather than db
              />
            </td>
          </tr>
        </tbody>
      </table>
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
