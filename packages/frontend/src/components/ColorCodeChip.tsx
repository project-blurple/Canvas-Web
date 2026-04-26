"use client";

import { PaletteColorSummary } from "@blurple-canvas-web/types";
import { styled } from "@mui/material";
import { PrimitiveButton } from "./button";
import VisuallyHidden from "./VisuallyHidden";

const StyledButton = styled(PrimitiveButton)`
  background-color: oklch(from var(--discord-white) l c h / 12%);
  border-radius: 0.25rem;
  cursor: pointer;
  display: inline-block;
  font-size: 0.9rem;
  padding-block: 0.175em;
  padding-inline: 0.5em;
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

const copyToClipboard = (str: string) => navigator.clipboard.writeText(str);

interface ColorCodeChipProps extends Omit<
  React.ComponentPropsWithRef<typeof StyledButton>,
  "color"
> {
  color: PaletteColorSummary;
}

export default function ColorCodeChip({ color, ...props }: ColorCodeChipProps) {
  const { code: colorCode } = color;

  const clickHandler = () => copyToClipboard(colorCode);
  const keyUpHandler = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") copyToClipboard(colorCode);
  };

  return (
    <StyledButton onClick={clickHandler} onKeyUp={keyUpHandler} {...props}>
      <code aria-hidden>{colorCode}</code>
      <VisuallyHidden>
        Code {colorCode.split("").join("-")}. Click to copy.
      </VisuallyHidden>
    </StyledButton>
  );
}
