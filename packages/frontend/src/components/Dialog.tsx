import { styled } from "@mui/material";
import type React from "react";
import { useEffect, useRef } from "react";

const StyledDialog = styled("dialog")`
  background-color: var(--discord-legacy-not-quite-black);
  border: var(--card-border);
  margin: auto;
  max-width: calc(100vw - 2rem);
  padding: 1rem;

  &::backdrop {
    backdrop-filter: blur(4px);
    background: oklch(0% 0% / 0.75);
  }

  &[open] {
    display: flex;
    flex-direction: column;
  }
`;

export type DialogProps = Omit<
  React.ComponentPropsWithoutRef<"dialog">,
  "open" | "onCancel"
> & {
  open: boolean;
  onRequestClose: () => void;
};

export default function Dialog({
  open,
  onRequestClose,
  onPointerDown,
  children,
  ...props
}: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      if (!dialog.open) {
        dialog.showModal();
      }
      return;
    }

    if (dialog.open) {
      dialog.close();
    }
  }, [open]);

  function handleCancel(event: React.SyntheticEvent<HTMLDialogElement>) {
    event.preventDefault();
    onRequestClose();
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) {
      onRequestClose();
    }

    onPointerDown?.(event);
  }

  return (
    <StyledDialog
      ref={dialogRef}
      onCancel={handleCancel}
      onPointerDown={handlePointerDown}
      {...props}
    >
      {children}
    </StyledDialog>
  );
}
