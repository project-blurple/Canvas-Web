"use client";

import {
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControlLabel,
  styled,
} from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useRef, useState } from "react";
import config from "@/config/clientConfig";
import { useCanvasContext } from "@/contexts";
import type { ComplexPixelHistoryParams } from "@/hooks/queries/usePixelHistory";
import { StyledButton } from "../button/DynamicButton";

const StyledDialog = styled(Dialog)`
  & .MuiDialog-paper {
    box-shadow: none;
    background-image: none;
  }
`;

const Button = styled(StyledButton)`
  color: white;
`;

const RedButton = styled(Button)`
  &:hover,
  &:focus-visible {
    background-color: rgb(255, 0, 0);
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

  return (
    <>
      <RedButton disabled={entriesCount === 0} onClick={handleEraseHistory}>
        Erase {entriesCount.toLocaleString()} history{" "}
        {entriesCount !== 1 ? "entries" : "entry"}
      </RedButton>
      <StyledDialog
        open={isEraseConfirmOpen}
        onClose={handleCancelErase}
        aria-labelledby="erase-history-dialog-title"
        aria-describedby="erase-history-dialog-description"
      >
        <DialogTitle id="erase-history-dialog-title">
          Erase history?
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="erase-history-dialog-description">
            Delete
            {entriesCount.toLocaleString()} history&nbsp;
            {entriesCount !== 1 ? "entries" : "entry"}? This cannot be undone.
          </DialogContentText>
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                defaultChecked={false}
                slotProps={{
                  input: {
                    ref: blockWhileEraseRef,
                  },
                }}
              />
            }
            label={`Add ${usersLength.toLocaleString()} user${usersLength !== 1 ? "s" : ""} to blocklist`}
            disabled={entriesCount === 0}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelErase}>Cancel</Button>
          <RedButton onClick={handleConfirmErase}>Erase</RedButton>
        </DialogActions>
      </StyledDialog>
    </>
  );
}
