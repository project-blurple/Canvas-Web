import { styled } from "@mui/material";
import { PrimitiveButton } from "../button";
import { StaticSwatch } from "./StaticSwatch";

const StyledSwatch = styled(StaticSwatch, { shouldForwardProp: () => true })`
  border: 0.25rem solid oklch(from var(--discord-white) l c h / 15%);
  transition: var(--transition-duration-fast) ease;
  transition-property: opacity, outline-width, border-color;

  @media (hover: hover) and (pointer: fine) {
    &:hover:not(:disabled, [aria-selected="true"]) {
      opacity: 85%;
    }
  }

  &:focus-visible {
    outline: var(--focus-outline);
  }

  &[aria-selected="true"] {
    border: 0.25rem solid var(--discord-white);
    background-clip: content-box;
    padding: 0.25rem;
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
