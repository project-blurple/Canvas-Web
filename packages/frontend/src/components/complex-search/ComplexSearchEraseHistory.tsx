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

const StyledDialog = styled(Dialog)(() => ({
  "& .MuiDialog-paper": {
    boxShadow: "none",
    backgroundImage: "none",
  },
}));

interface ComplexSearchEraseHistoryProps {
  entriesCount: number;
  usersLength: number;
  onConfirm: (blockWhileErase: boolean) => Promise<void> | void;
}

export default function ComplexSearchEraseHistory({
  entriesCount,
  usersLength,
  onConfirm,
}: ComplexSearchEraseHistoryProps) {
  const [blockWhileErase, setBlockWhileErase] = useState(false);
  const [isEraseConfirmOpen, setIsEraseConfirmOpen] = useState(false);

  function handleEraseHistory() {
    setIsEraseConfirmOpen(true);
  }

  async function handleConfirmErase() {
    setIsEraseConfirmOpen(false);

    try {
      await onConfirm(blockWhileErase);
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
