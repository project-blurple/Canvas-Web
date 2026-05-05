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
import { useState } from "react";
import { DynamicButton } from "@/components/button";
import { PixelHistoryWrapper } from "@blurple-canvas-web/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import config from "@/config/clientConfig";
import axios from "axios";
import { useCanvasContext } from "@/contexts";

const StyledDialog = styled(Dialog)(() => ({
  "& .MuiDialog-paper": {
    boxShadow: "none",
    backgroundImage: "none",
  },
}));

interface ComplexSearchEraseHistoryProps {
  entriesCount: number;
  usersLength: number;
  historyData: PixelHistoryWrapper;
  resetResults: () => void;
}

export default function ComplexSearchEraseHistory({
  entriesCount,
  usersLength,
  historyData,
  resetResults,
}: ComplexSearchEraseHistoryProps) {
  const { canvas } = useCanvasContext();
  const queryClient = useQueryClient();

  const [blockWhileErase, setBlockWhileErase] = useState(false);
  const [isEraseConfirmOpen, setIsEraseConfirmOpen] = useState(false);

  async function performErase(blockWhileErase: boolean) {
    console.log(
      "Erasing history...",
      blockWhileErase,
      historyData.totalEntries,
    );

    try {
      await eraseHistoryMutation.mutateAsync();
      resetResults();
    } catch (error) {
      console.error(error);
      alert("Failed to erase history");
    }
  }

  const invalidateHistoryQueries = async () => {
    queryClient.invalidateQueries({
      queryKey: ["complexPixelHistory", canvas.id],
      // Erasing all complex searches for the canvas - we don't know what previous queries are also invalidated, so we just invalidate them all to be safe
    });
  };

  const eraseHistoryMutation = useMutation({
    mutationFn: async () => {
      const requestUrl = `${config.apiUrl}/api/v1/history`;

      const body = {
        historyIds: historyData.historyIds,
        shouldBlockAuthors: blockWhileErase,
      };

      await axios.delete(requestUrl, {
        data: body,
        withCredentials: true,
      });
    },
    onSuccess: invalidateHistoryQueries,
  });

  function handleEraseHistory() {
    setIsEraseConfirmOpen(true);
  }

  async function handleConfirmErase() {
    setIsEraseConfirmOpen(false);

    try {
      await performErase(blockWhileErase);
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
      <DynamicButton
        disabled={entriesCount === 0}
        backgroundColorStr="rgb(255,0,0)"
        onClick={handleEraseHistory}
      >
        Erase {entriesCount.toLocaleString()} history{" "}
        {entriesCount !== 1 ? "entries" : "entry"}
      </DynamicButton>
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
            This will <em>permanently</em> delete{" "}
            {entriesCount.toLocaleString()} history{" "}
            {entriesCount !== 1 ? "entries" : "entry"}. Are you sure you want to
            continue?
          </DialogContentText>
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={blockWhileErase}
                onChange={() => setBlockWhileErase(!blockWhileErase)}
              />
            }
            label={`Add ${usersLength.toLocaleString()} user${usersLength !== 1 ? "s" : ""} to the blocklist`}
            disabled={entriesCount === 0}
          />
        </DialogContent>
        <DialogActions>
          <DynamicButton onClick={handleCancelErase}>Cancel</DynamicButton>
          <DynamicButton
            backgroundColorStr="rgb(255,0,0)"
            onClick={handleConfirmErase}
          >
            Erase
          </DynamicButton>
        </DialogActions>
      </StyledDialog>
    </>
  );
}
