import { styled } from "@mui/material";
import { Lock as LockIcon } from "lucide-react";
import { PrimitiveButton } from "../button";
import { StaticSwatch } from "./StaticSwatch";

const StyledSwatch = styled(StaticSwatch, { shouldForwardProp: () => true })`
  border-color: oklch(from var(--discord-white) l c h / 15%);
  border-style: solid;
  border-width: 3px;
  position: relative;
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
   * why it can't be placed yet) while making it visually distinct. The lock
   * badge handles the disabled-state cue so we don't have to dim the swatch
   * colors. */
  &[aria-disabled="true"] {
    cursor: not-allowed;
  }
`;

const DisabledLockBadge = styled("span")`
  background-color: oklch(from var(--discord-black) l c h / 72%);
  block-size: 1rem;
  border: 1px solid oklch(from var(--discord-white) l c h / 28%);
  border-radius: 999px;
  bottom: 4px;
  color: var(--discord-white);
  display: grid;
  inline-size: 1rem;
  inset-inline-end: 4px;
  place-items: center;
  pointer-events: none;
  position: absolute;

  & > svg {
    block-size: 0.625rem;
    inline-size: 0.625rem;
    /* Putting it up a little bit to make it feel more in the center in the badge. */
    transform: translateY(-0.5px);
  }
`;

export function InteractiveSwatch(
  props: React.ComponentPropsWithRef<typeof StaticSwatch>,
) {
  const ariaDisabled = props["aria-disabled"];
  const isDisabled = ariaDisabled === true || ariaDisabled === "true";

  return (
    <StyledSwatch
      as={PrimitiveButton}
      role="option"
      // @ts-expect-error `styled` generic typing can’t handle `as` prop
      type="button"
      {...props}
    >
      {isDisabled && (
        <DisabledLockBadge aria-hidden>
          <LockIcon />
        </DisabledLockBadge>
      )}
    </StyledSwatch>
  );
}
