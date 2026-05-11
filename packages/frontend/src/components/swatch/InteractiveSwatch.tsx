import { styled } from "@mui/material";
import { PrimitiveButton } from "../button";
import { StaticSwatch } from "./StaticSwatch";

const StyledSwatch = styled(StaticSwatch, { shouldForwardProp: () => true })`
  border-color: oklch(from var(--discord-white) l c h / 15%);
  border-style: solid;
  border-width: 3px;
  transition-property: border-color, outline-width;
  transition: var(--transition-duration-fast) ease;
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
    padding: 0.25rem;
  }

  &:active {
    scale: 97%;
  }

  &:disabled {
    cursor: not-allowed;
  }
`;

interface InteractiveSwatchProps extends React.ComponentPropsWithRef<
  typeof StaticSwatch
> {}

export function InteractiveSwatch(props: InteractiveSwatchProps) {
  return <StyledSwatch as={PrimitiveButton} role="option" {...props} />;
}
