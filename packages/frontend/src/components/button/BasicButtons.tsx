import { styled } from "@mui/material";
import { Button } from "./Button";

export const BasicButton = styled(Button)`
  background-color: var(--discord-legacy-dark-but-not-black);
  color: var(--discord-white);

  &:hover,
  &:focus-visible {
    border-color: oklch(from var(--discord-white) l c h / 36%);
  }

  @media (hover: hover) and (pointer: fine) {
    :hover {
      background-color: var(--discord-blurple);
    }
  }
`;

export const DestructiveButton = styled(BasicButton)`
  @media (hover: hover) and (pointer: fine) {
    :hover {
      background-color: var(--discord-red);
    }
  }
`;
