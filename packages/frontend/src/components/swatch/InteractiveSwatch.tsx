import { styled } from "@mui/material";
import { PrimitiveButton } from "../button";
import { StaticSwatch } from "./StaticSwatch";

const StyledSwatch = styled(StaticSwatch, { shouldForwardProp: () => true })`
  border-color: oklch(from var(--discord-white) l c h / 15%);
  border-style: solid;
  border-width: 3px;
  transition: var(--transition-duration-fast) ease;
  transition-property: border-color, outline-width, padding, scale;
  will-change: opacity; /* Chromium fumbles hover style without this 🤷 */

  @media (hover: hover) and (pointer: fine) {
    &:hover:not([aria-disabled="true"], [aria-selected="true"]) {
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

  &:active:not([aria-disabled="true"]) {
    scale: 97%;
  }

  /* aria-disabled keeps the swatch clickable (so the user can select it to see
   * why it can't be placed yet) while making it visually distinct. */
  &[aria-disabled="true"] {
    cursor: not-allowed;
    opacity: 45%;
  }
`;

export function InteractiveSwatch(
  props: React.ComponentPropsWithRef<typeof StaticSwatch>,
) {
  return (
    <StyledSwatch
      as={PrimitiveButton}
      role="option"
      // @ts-expect-error `styled` generic typing can’t handle `as` prop
      type="button"
      {...props}
    />
  );
}
