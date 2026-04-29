import { styled } from "@mui/material";

import { StaticSwatchProps } from "./StaticSwatch";
import { SwatchBase } from "./SwatchBase";

export const StyledSwatchBase = styled(SwatchBase)`
  cursor: pointer;
  border: 0.25rem solid oklch(from var(--discord-white) l c h / 15%);
  transition: var(--transition-duration-fast) ease;
  transition-property: opacity, outline-width, border-color;

  @media (hover: hover) and (pointer: fine) {
    &:hover:not(.disabled, .selected) {
      opacity: 85%;
    }
  }

  &:focus-visible {
    outline: var(--focus-outline);
  }

  &.selected {
    border: 0.25rem solid var(--discord-white);
    background-clip: content-box;
    padding: 0.25rem;
  }
`;

export const rgbaToCssString = (
  rgba: [number, number, number, number],
): `rgb(${string} ${string} ${string} / ${string})` => {
  // Convert [255, 255, 255, 255] to rgb(255 255 255 / 1.0)
  const alphaFloat = rgba[3] / 0xff;
  return `rgb(${rgba[0]} ${rgba[1]} ${rgba[2]} / ${alphaFloat})`;
};

type InteractiveSwatchProps = StaticSwatchProps & {
  onAction: () => void;
  selected?: boolean;
  disabled?: boolean;
};

export function InteractiveSwatch({
  disabled = false,
  onAction,
  rgba,
  selected = false,
  ...props
}: InteractiveSwatchProps) {
  const clickHandler = onAction;
  const keyUpHandler = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") onAction();
  };

  return (
    <StyledSwatchBase
      aria-disabled={disabled}
      className={selected ? "selected" : undefined}
      colorString={rgbaToCssString(rgba)}
      onClick={clickHandler}
      onKeyUp={keyUpHandler}
      tabIndex={0}
      {...props}
    />
  );
}
