import { styled } from "@mui/material";
import type React from "react";
import { useEffect, useRef } from "react";

const StyledDialog = styled("dialog")`
  background-color: var(--discord-legacy-not-quite-black);
  border: var(--card-border);
  margin: auto;
  max-inline-size: calc(100vw - 2rem);
  max-inline-size: calc(100dvi - 2rem);
  padding: 1rem;
  border-radius: var(--card-border-radius);

  &::backdrop {
    backdrop-filter: blur(4px);
    background-color: oklch(0% 0% 0 / 0.75);
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
    const rect = event.currentTarget.getBoundingClientRect();

    const clickedOutside =
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom;

    if (clickedOutside) {
      onRequestClose();
    }
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
