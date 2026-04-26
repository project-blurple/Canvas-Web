"use client";

import { PaletteColorSummary } from "@blurple-canvas-web/types";
import { styled } from "@mui/material";
import { PrimitiveButton } from "./button";

const StyledButton = styled(PrimitiveButton)`
  background-color: oklch(from var(--discord-white) l c h / 12%);
  border-radius: 0.25rem;
  cursor: pointer;
  display: inline-block;
  font-size: 0.9rem;
  padding-block: 0.25rem;
  padding-inline: 0.5rem;
  text-box-trim: trim-both;

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      background-color: oklch(from var(--discord-white) l c h / 20%);
    }
  }

  &:focus-visible {
    background-color: oklch(from var(--discord-white) l c h / 20%);
    outline: var(--focus-outline);
  }

  &:active {
    background-color: oklch(from var(--discord-white) l c h / 6%);
  }
`;

const copyToClipBoard = (str: string) => navigator.clipboard.writeText(str);

interface ColorCodeChipProps extends Omit<
  React.ComponentPropsWithRef<typeof StyledButton>,
  "color"
> {
  color: PaletteColorSummary;
}

export default function ColorCodeChip({ color, ...props }: ColorCodeChipProps) {
  const { code: colorCode } = color;

  const clickHandler = () => copyToClipBoard(colorCode);
  const keyUpHandler = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") copyToClipBoard(colorCode);
  };

  return (
    <StyledButton onClick={clickHandler} onKeyUp={keyUpHandler} {...props}>
      <code>{colorCode}</code>
    </StyledButton>
  );
}
