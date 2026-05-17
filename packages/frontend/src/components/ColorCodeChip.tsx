"use client";

import type { PaletteColorSummary } from "@blurple-canvas-web/types";
import { css, styled } from "@mui/material";
import { PrimitiveButton } from "./button";
import VisuallyHidden from "./VisuallyHidden";

const StyledButton = styled(PrimitiveButton, {
  shouldForwardProp: (prop) => prop !== "backgroundColorStr",
})<{ backgroundColorStr?: string }>`
  --dynamic-bg-color: var(--discord-white);
  ${({ backgroundColorStr }) =>
    backgroundColorStr &&
    css`
      --dynamic-bg-color: ${backgroundColorStr};
    `}

  background-color: oklch(
    from var(--dynamic-bg-color) l c h /
    ${({ backgroundColorStr }) => (backgroundColorStr ? "100%" : "12%")}
  );

  border-radius: 0.25rem;
  cursor: pointer;
  display: inline-block;
  font-size: 0.9rem;
  padding-block: 0.175em;
  padding-inline: 0.5em;
  text-box-trim: trim-both;

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      background-color: oklch(
        from var(--dynamic-bg-color) l c h /
          ${({ backgroundColorStr }) => (backgroundColorStr ? "80%" : "20%")}
      );
    }
  }

  &:focus-visible {
    background-color: oklch(
      from var(--dynamic-bg-color) l c h /
        ${({ backgroundColorStr }) => (backgroundColorStr ? "80%" : "20%")}
    );
    outline: var(--focus-outline);
  }

  &:active {
    background-color: oklch(
      from var(--dynamic-bg-color) l c h /
        ${({ backgroundColorStr }) => (backgroundColorStr ? "94%" : "6%")}
    );
  }
`;

const ButtonContent = styled("code")`
  @supports (color: color-mix(in oklab, black, black)) {
    color: color-mix(
      in oklab,
      contrast-color(var(--dynamic-bg-color)) 94%,
      var(--dynamic-bg-color)
    );
  }
`;

interface ColorCodeChipProps extends Omit<
  React.ComponentPropsWithRef<typeof StyledButton>,
  "color"
> {
  color: PaletteColorSummary;
}

export default function ColorCodeChip({ color, ...props }: ColorCodeChipProps) {
  const { code: colorCode } = color;

  const clickHandler = async () =>
    await navigator.clipboard.writeText(colorCode);
  const keyUpHandler = async (event: React.KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      await navigator.clipboard.writeText(colorCode);
    }
  };

  return (
    <StyledButton onClick={clickHandler} onKeyUp={keyUpHandler} {...props}>
      <ButtonContent aria-hidden>{colorCode}</ButtonContent>
      <VisuallyHidden>
        Code {colorCode.split("").join("-")}. Click to copy.
      </VisuallyHidden>
    </StyledButton>
  );
}
