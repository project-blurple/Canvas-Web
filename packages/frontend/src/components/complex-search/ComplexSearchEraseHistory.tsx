"use client";

import { styled } from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useRef, useState } from "react";
import config from "@/config/clientConfig";
import { useCanvasContext } from "@/contexts";
import type { ComplexPixelHistoryQuery } from "@/hooks/queries/usePixelHistory";
import { Button } from "../button";
import Dialog from "../Dialog";

const StyledDialog = styled(Dialog)`
  gap: 0.75rem;

  h2 {
    color: var(--discord-white);
    font-size: 1.5rem;
    font-weight: 600;
  }
`;

const StyledButton = styled(Button)`
  background-color: var(--discord-legacy-dark-but-not-black);
  color: var(--discord-white);

  @media (hover: hover) and (pointer: fine) {
    :hover {
      background-color: var(--discord-blurple);
    }
  }
`;

const RedStyledButton = styled(StyledButton)`
  @media (hover: hover) and (pointer: fine) {
    :hover {
      background-color: rgb(255, 0, 0);
    }
  }
`;

const DialogButtons = styled("div")`
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  margin-top: 1rem;
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
  query: ComplexPixelHistoryQuery;
  resetResults: () => void;
}

export default function ComplexSearchEraseHistory({
  entriesCount,
  usersLength,
  query,
  resetResults,
}: ComplexSearchEraseHistoryProps) {
  const { canvas } = useCanvasContext();
  const queryClient = useQueryClient();

  const [isEraseConfirmOpen, setIsEraseConfirmOpen] = useState(false);
  const blockWhileEraseRef = useRef<HTMLInputElement>(null);

  const eraseHistoryMutation = useMutation({
    mutationFn: async (shouldBlockAuthors: boolean) => {
      const requestUrl = `${config.apiUrl}/api/v1/canvas/${encodeURIComponent(canvas.id)}/pixel/history`;

      const body = {
        x0: query.point0.x,
        y0: query.point0.y,
        ...(query.point1 !== undefined && {
          x1: query.point1.x,
          y1: query.point1.y,
        }),
        ...(query.fromDateTime && { fromDateTime: query.fromDateTime }),
        ...(query.toDateTime && { toDateTime: query.toDateTime }),
        ...(query.includeUserIds && { includeUserIds: query.includeUserIds }),
        ...(query.excludeUserIds && { excludeUserIds: query.excludeUserIds }),
        ...(query.includeColors && { includeColors: query.includeColors }),
        ...(query.excludeColors && { excludeColors: query.excludeColors }),
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

  return (
    <>
      <RedStyledButton
        disabled={entriesCount === 0}
        onClick={handleEraseHistory}
      >
        Erase {entriesCount.toLocaleString()} history{" "}
        {entriesCount !== 1 ? "entries" : "entry"}
      </RedStyledButton>
      <StyledDialog
        open={isEraseConfirmOpen}
        onRequestClose={handleCancelErase}
        aria-labelledby="erase-history-dialog-title"
        aria-describedby="erase-history-dialog-description"
      >
        <h2 id="erase-history-dialog-title">Erase history?</h2>
        <p id="erase-history-dialog-description">
          Delete {entriesCount.toLocaleString()} history&nbsp;
          {entriesCount !== 1 ? "entries" : "entry"}? This cannot be undone.
        </p>
        <StyledLabel aria-disabled={entriesCount === 0}>
          <input
            type="checkbox"
            ref={blockWhileEraseRef}
            defaultChecked={false}
            disabled={entriesCount === 0}
            aria-disabled={entriesCount === 0}
          />
          <span>
            {`Add ${usersLength.toLocaleString()} ${usersLength !== 1 ? "users" : "user"} to blocklist`}
          </span>
        </StyledLabel>
        <DialogButtons>
          <StyledButton onClick={handleCancelErase}>Cancel</StyledButton>
          <RedStyledButton onClick={handleConfirmErase}>Erase</RedStyledButton>
        </DialogButtons>
      </StyledDialog>
    </>
  );
}
