import { styled } from "@mui/material";
import { LockKeyhole as LockIcon, Pipette } from "lucide-react";
import { PrimitiveButton } from "../button";
import VisuallyHidden from "../VisuallyHidden";
import { StaticSwatch } from "./StaticSwatch";

const StyledSwatch = styled(StaticSwatch, {
  shouldForwardProp: () => true,
})`
  align-items: center;
  border-width: 3px;
  display: flex;
  justify-content: center;
  position: relative;
  transition: var(--transition-duration-fast) ease;
  transition-property: border-color, outline-width, padding, scale;
  will-change: opacity; /* Chromium fumbles hover style without this 🤷 */

  @media (hover: hover) and (pointer: fine) {
    &:hover:not([aria-selected="true"]) {
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
`;

const DisabledLockOverlay = styled("span")`
  display: grid;
  inset: 0;
  place-items: center;
  pointer-events: none;
  position: absolute;

  & > svg {
    block-size: 33%;
    inline-size: 33%;
    opacity: 60%;
  }
`;

interface InteractiveSwatchProps extends React.ComponentPropsWithRef<
  typeof StaticSwatch
> {
  locked?: boolean;
}

export function InteractiveSwatch({
  children,
  locked,
  ...props
}: InteractiveSwatchProps) {
  return (
    <StyledSwatch
      as={PrimitiveButton}
      role="option"
      // @ts-expect-error `styled` generic typing can’t handle `as` prop
      type="button"
      {...props}
    >
      {children}
      {locked && (
        <DisabledLockOverlay>
          <LockIcon />
          <VisuallyHidden>Locked</VisuallyHidden>
        </DisabledLockOverlay>
      )}
    </StyledSwatch>
  );
}

export function EyedropperSwatch(props: InteractiveSwatchProps) {
  return (
    <InteractiveSwatch {...props}>
      <Pipette />
    </InteractiveSwatch>
  );
}
