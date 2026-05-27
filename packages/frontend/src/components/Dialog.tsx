import { styled } from "@mui/material";
import type React from "react";
import { useRef } from "react";

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
  const openRef = useRef(open);

  openRef.current = open;

  function setDialogRef(dialog: HTMLDialogElement | null) {
    dialogRef.current = dialog;

    if (!dialog) {
      return;
    }

    if (open && !dialog.open) {
      dialog.showModal();
      return;
    }

    if (!open && dialog.open) {
      dialog.close();
    }
  }

  function handleCancel(event: React.SyntheticEvent<HTMLDialogElement>) {
    event.preventDefault();
    onRequestClose();
  }

  function handleClose() {
    if (openRef.current) {
      onRequestClose();
    }
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
      ref={setDialogRef}
      onClose={handleClose}
      onCancel={handleCancel}
      onPointerDown={handlePointerDown}
      {...props}
    >
      {children}
    </StyledDialog>
  );
}
