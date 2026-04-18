"use client";

import { PixelColor } from "@blurple-canvas-web/types";
import { buttonClasses, css, styled } from "@mui/material";

import { Button as ButtonBase } from "@/components/button";

const StyledAnchor = styled("a")`
  display: contents;
`;

const StyledButton = styled(ButtonBase, {
  shouldForwardProp: (prop) => prop !== "backgroundColorStr",
})<{ backgroundColorStr?: string }>`
  :not(.${buttonClasses.disabled}) {
    --dynamic-bg-color: var(--discord-blurple);
    background-color: var(--dynamic-bg-color);

    &:hover,
    &:focus-visible {
      ${({ backgroundColorStr }) =>
        backgroundColorStr &&
        css`
          --dynamic-bg-color: ${backgroundColorStr};
        `}
      border-color: oklch(from var(--discord-white) l c h / 36%);
      font-weight: 600;
    }
  }

  &:active {
    border-color: oklch(from var(--discord-white) l c h / 72%);
    font-weight: 450;
  }
`;

const DynamicButtonContent = styled("span")`
  display: block flex;
  gap: 0.25rem;
  transition-duration: var(--transition-duration-fast);
  transition-property: color, filter, font-weight;
  transition-timing-function: ease;

  @supports (color: color-mix(in oklab, black, black)) {
    color: color-mix(
      in oklab,
      contrast-color(var(--dynamic-bg-color)) 94%,
      var(--dynamic-bg-color)
    );
  }

  @supports not (color: color-mix(in oklab, black, black)) {
    /*
     * Ensure contrast of button label against background. The color property
     * should match that of the background it sits against.
     * From https://robinrendle.com/the-cascade/015-context-aware-colors
     */
    color: var(--dynamic-bg-color);
    filter: invert(1) grayscale(1) brightness(1.3) contrast(9000);
    mix-blend-mode: luminosity;
  }
`;

interface DynamicButtonProps {
  children: React.ReactNode;
  color: PixelColor | null;
  disabled?: boolean;
  onAction?: () => void;
}

export default function DynamicButton({
  children,
  color,
  disabled = false,
  onAction,
  ...props
}: DynamicButtonProps) {
  const rgb = color?.slice(0, 3).join(" ");
  const backgroundColorStr = rgb ? `rgb(${rgb})` : undefined;

  const clickHandler = onAction;
  const keyUpHandler = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      onAction?.();
    }
  };

  return (
    <StyledButton
      backgroundColorStr={backgroundColorStr}
      onClick={clickHandler}
      onKeyUp={keyUpHandler}
      disabled={disabled}
      {...props}
    >
      <DynamicButtonContent>{children}</DynamicButtonContent>
    </StyledButton>
  );
}

export function DynamicAnchorButton({
  href,
  ...props
}: DynamicButtonProps & { href: string }) {
  return (
    <StyledAnchor href={href} target="_blank" rel="noreferrer">
      <DynamicButton {...props} />
    </StyledAnchor>
  );
}
