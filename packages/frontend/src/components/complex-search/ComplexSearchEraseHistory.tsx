"use client";

import { styled } from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useRef, useState } from "react";
import config from "@/config/clientConfig";
import { useCanvasContext } from "@/contexts";
import { useEventInfo } from "@/hooks";
import type { ComplexPixelHistoryParams } from "@/hooks/queries/usePixelHistory";
import { BasicButton, DestructiveButton } from "../button";
import Dialog from "../Dialog";

const StyledDialog = styled(Dialog)`
  gap: 0.75rem;

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

const ButtonRow = styled("div")`
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  margin-block-start: 1rem;
`;

const StyledLabel = styled("label")`
  align-items: center;
  cursor: pointer;
  display: flex;
  gap: 0.5rem;
  opacity: 1;

  &[aria-disabled="true"] {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

interface ComplexSearchEraseHistoryProps {
  entriesCount: number;
  usersLength: number;
  params: ComplexPixelHistoryParams;
  resetResults: () => void;
}

export default function ComplexSearchEraseHistory({
  entriesCount,
  usersLength,
  params,
  resetResults,
}: ComplexSearchEraseHistoryProps) {
  const { canvas } = useCanvasContext();
  const { data: currentEvent } = useEventInfo();
  const queryClient = useQueryClient();

  const [isEraseConfirmOpen, setIsEraseConfirmOpen] = useState(false);
  const blockWhileEraseRef = useRef<HTMLInputElement>(null);

  const eraseHistoryMutation = useMutation({
    mutationFn: async (shouldBlockAuthors: boolean) => {
      const requestUrl = `${config.apiUrl}/api/v1/canvas/${encodeURIComponent(canvas.id)}/pixel/history`;

      const body = {
        x0: params.point0.x,
        y0: params.point0.y,
        ...(params.point1 !== undefined && {
          x1: params.point1.x,
          y1: params.point1.y,
        }),
        ...(params.fromDateTime && { fromDateTime: params.fromDateTime }),
        ...(params.toDateTime && { toDateTime: params.toDateTime }),
        ...(params.includeUserIds && { includeUserIds: params.includeUserIds }),
        ...(params.excludeUserIds && { excludeUserIds: params.excludeUserIds }),
        ...(params.includeColors && { includeColors: params.includeColors }),
        ...(params.excludeColors && { excludeColors: params.excludeColors }),
        shouldBlockAuthors,
      };

      await axios.delete(requestUrl, {
        data: body,
        withCredentials: true,
      });
    },
    onSuccess: invalidateHistoryQueries,
  });

  const { mutateAsync: eraseHistory } = eraseHistoryMutation;

  async function performErase(shouldBlockAuthors: boolean) {
    await eraseHistory(shouldBlockAuthors);
    resetResults();
  }

  async function invalidateHistoryQueries() {
    queryClient.invalidateQueries({
      queryKey: ["complexPixelHistory", canvas.id],
      // Erasing all complex searches for the canvas - we don't know what previous queries are also invalidated, so we just invalidate them all to be safe
    });
  }

  function handleEraseHistory() {
    setIsEraseConfirmOpen(true);
  }

  async function handleConfirmErase() {
    setIsEraseConfirmOpen(false);
    const shouldBlockAuthors = blockWhileEraseRef.current?.checked ?? false;

    try {
      await performErase(shouldBlockAuthors);
    } catch (error) {
      console.error(error);
      alert("Failed to erase history");
    }
  }

  function handleCancelErase() {
    setIsEraseConfirmOpen(false);
  }

  const isDisabled = entriesCount === 0 || currentEvent?.id !== canvas.eventId;

  return (
    <>
      <DestructiveButton disabled={isDisabled} onClick={handleEraseHistory}>
        Erase {entriesCount.toLocaleString()} history{" "}
        {entriesCount !== 1 ? "entries" : "entry"}
      </DestructiveButton>
      <StyledDialog
        open={isEraseConfirmOpen}
        onRequestClose={handleCancelErase}
      >
        <h2 id="erase-history-dialog-title">Erase history?</h2>
        <p id="erase-history-dialog-description">
          Delete {entriesCount.toLocaleString()} history&nbsp;
          {entriesCount !== 1 ? "entries" : "entry"}? This cannot be undone.
        </p>
        <StyledLabel>
          <input
            type="checkbox"
            ref={blockWhileEraseRef}
            disabled={entriesCount === 0}
          />
          <span>
            {`Add ${usersLength.toLocaleString()} ${usersLength !== 1 ? "users" : "user"} to blocklist`}
          </span>
        </StyledLabel>
        <ButtonRow>
          <BasicButton onClick={handleCancelErase}>Cancel</BasicButton>
          <DestructiveButton onClick={handleConfirmErase}>
            Erase
          </DestructiveButton>
        </ButtonRow>
      </StyledDialog>
    </>
  );
}
