import { styled } from "@mui/material";
import React from "react";

export const ActionPanelTabBody = styled("div")`
  display: block flex;
  flex-direction: column;
  background-color: var(--discord-legacy-not-quite-black);
  gap: 0.5rem;

  > * {
    background-color: var(--discord-legacy-dark-but-not-black);
    border-radius: inherit;
    margin-trim: block;
    padding: var(--padding-width);

    @supports not (margin-trim: block) {
      > :first-child {
        margin-block-start: 0;
      }
      > :last-child {
        margin-block-end: 0;
      }
    }
  }
`;

const Block = styled("div")`
  overflow-y: auto; // Fallback property, should appear before overflow-block
  overflow-block: auto;
  > * {
    border-radius: inherit;
  }
`;

const StyledBlock = styled(Block, {
  shouldForwardProp: (prop) => prop !== "active",
})<{ active?: boolean }>`
  display: ${({ active }) => (active ? "grid" : "none")};
  gap: 0.5rem;
  grid-template-rows: auto 1fr auto;
`;

export function TabPanel(
  props: React.ComponentPropsWithRef<typeof StyledBlock>,
) {
  return <StyledBlock role="tabpanel" {...props} />;
}

export const ScrollBlock = styled(Block)`
  align-self: stretch;
  grid-column: 1 / -1;
`;
