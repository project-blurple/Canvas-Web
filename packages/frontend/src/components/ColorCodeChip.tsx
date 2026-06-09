"use client";

import type { PaletteColorSummary } from "@blurple-canvas-web/types";
import { styled } from "@mui/material";
import PrimitiveButton from "./button/PrimitiveButton";
import VisuallyHidden from "./VisuallyHidden";

const StyledButton = styled(PrimitiveButton)`
  align-items: center;
  background-color: oklch(1 0 0 / 12%);
  background-color: buttonface;
  border-radius: 0.25rem;
  display: inline flex;
  font-size: 85%;
  gap: 0.25em;
  padding-block: 0.15em;
  padding-inline: 0.5em;
  text-box-trim: trim-both;

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      background-color: oklch(1 0 0 / 20%);
    }
  }

  &:focus-visible {
    background-color: oklch(1 0 0 / 20%);
    outline: var(--focus-outline);
  }

  &:active {
    background-color: oklch(1 0 0 / 6%);
  }
`;

interface ColorCodeChipProps extends Omit<
  React.ComponentPropsWithRef<typeof StyledButton>,
  "color"
> {
  color: PaletteColorSummary;
  ornament?: React.ReactNode;
}

export default function ColorCodeChip({
  color,
  ornament,
  ...props
}: ColorCodeChipProps) {
  const { code: colorCode } = color;

  const copyCode = async () => await navigator.clipboard.writeText(colorCode);

  return (
    <StyledButton onClick={copyCode} {...props}>
      {ornament}
      <code aria-hidden>{colorCode}</code>
      <VisuallyHidden>
        Code {colorCode.split("").join("-")}. Click to copy.
      </VisuallyHidden>
    </StyledButton>
  );
}
