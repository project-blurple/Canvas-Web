"use client";

import { IconButton, styled } from "@mui/material";
import { Megaphone } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useId, useRef } from "react";
import { createPortal } from "react-dom";
import VisuallyHidden from "../VisuallyHidden";
import Noticeboard from "./Noticeboard";

const anchorName = "--notices-button";

const StyledIconButton = styled(IconButton)`
  anchor-name: ${anchorName};
`;

const Dialog = styled("dialog")`
  background-color: var(--discord-legacy-dark-but-not-black);
  border-radius: var(--card-border-radius);
  border: var(--card-border);
  box-shadow: 0 0 10px oklch(0 0 0 / 25%);
  inline-size: min(100vi, 36rem); /* fallback */
  inline-size: min(100dvi, 36rem);
  max-block-size: min(90vh, 60rem); /* fallback */
  max-block-size: min(90dvh, 60rem);
  overflow: auto;
  position-anchor: ${anchorName};
  position-area: block-end center;
  position: absolute;
  transform-origin: top center;
  transition-duration: 100ms;
  transition-property: opacity, transform;
  transition-timing-function: linear, var(--ease-out-quart);
  z-index: 1; /* Fighting with <CanvasView> here 😔 */

  > * {
    padding: calc(var(--card-border-radius) - 0.75rem);
  }

  opacity: 1;
  transform: scale(100%);
  @starting-style {
    opacity: 0;
    transform: scale(97%);
  }
`;

const Header = styled("header")`
  align-items: center;
  border-block-end: var(--card-border);
  display: flex;
  position: sticky;
`;

const Heading = styled("h2")`
  color: unset;
  font-size: inherit;
  font-weight: 500;
  margin-inline: 0.75rem;
`;

const searchParamKey = "notices";
const searchParamValue = "1";

export default function Notices() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const buttonRef = useRef<HTMLButtonElement>(null);

  const isOpen = searchParams.get("notices") === searchParamValue;

  const open: React.MouseEventHandler<HTMLButtonElement> = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    next.set(searchParamKey, searchParamValue);
    router.push(`?${next}`);
  }, [searchParams, router.push]);

  const close: React.MouseEventHandler<HTMLButtonElement> = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    next.delete(searchParamKey);
    router.push(`?${next}`);
  }, [searchParams, router.push]);

  const toggle = isOpen ? close : open;

  const buttonId = useId();
  const dialogId = useId();

  return (
    <>
      <StyledIconButton
        aria-expanded={isOpen}
        aria-haspopup="true"
        id={buttonId}
        onClick={toggle}
        popoverTarget="dialogId"
        ref={buttonRef}
      >
        <Megaphone />
        <VisuallyHidden>Notices</VisuallyHidden>
      </StyledIconButton>
      {createPortal(
        <Dialog id={dialogId} open={isOpen} popover="">
          <Header>
            <Heading>Notices</Heading>
          </Header>
          <Noticeboard />
        </Dialog>,
        document.body,
      )}
    </>
  );
}
