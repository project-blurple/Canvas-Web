import { styled } from "@mui/material";
import { PrimitiveButton } from "../button";
import { StaticSwatch } from "./StaticSwatch";

export const StyledSwatch = styled(StaticSwatch, { shouldForwardProp: () => true })`
  border-color: oklch(from var(--discord-white) l c h / 15%);
  border-style: solid;
  border-width: 3px;
  transition: var(--transition-duration-fast) ease;
  transition-property: border-color, outline-width, padding, scale;
  will-change: opacity; /* Chromium fumbles hover style without this 🤷 */

  @media (hover: hover) and (pointer: fine) {
    &:hover:not(:disabled, [aria-selected="true"]) {
      opacity: 85%;
    }
  }

  &:focus-visible {
    outline: var(--focus-outline);
  }

  &[aria-selected="true"] {
    border-color: var(--discord-white);
    background-clip: content-box;
    padding: 3px;
  }

  &:active {
    scale: 97%;
  }

  &:disabled {
    cursor: not-allowed;
  }
`;

export const rgbaToCssString = (
  rgba: [number, number, number, number],
): `rgb(${string} ${string} ${string} / ${string})` => {
  // Convert [255, 255, 255, 255] to rgb(255 255 255 / 1.0)
  const alphaFloat = rgba[3] / 0xff;
  return `rgb(${rgba[0]} ${rgba[1]} ${rgba[2]} / ${alphaFloat})`;
};

export function InteractiveSwatch(
  props: React.ComponentPropsWithRef<typeof StaticSwatch>,
) {
  return <StyledSwatch as={PrimitiveButton} role="option" {...props} />;
}
