import { Button as MuiButton, styled } from "@mui/material";

export const Button = styled(MuiButton)`
  border: oklch(from var(--discord-white) l c h / 12%) 3px solid;
  transition-duration: var(--transition-duration-fast);
  transition-property: background-color, border-color, color, scale;
  transition-timing-function: ease, ease, ease, ease, var(--ease-out-quad);
  &:active {
    scale: 99%;
  }
`;
