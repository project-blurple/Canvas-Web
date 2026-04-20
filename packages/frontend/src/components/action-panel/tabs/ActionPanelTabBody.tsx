import { styled } from "@mui/material";

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

export const Block = styled("div")`
  overflow-y: auto; // Fallback property, should appear before overflow-block
  overflow-block: auto;
  > * {
    border-radius: inherit;
  }
`;

export const TabBlock = styled(Block, {
  shouldForwardProp: (prop) => prop !== "active",
})<{ active?: boolean }>`
  display: ${({ active }) => (active ? "grid" : "none")};
  gap: 0.5rem;
  grid-template-rows: auto 1fr auto;
`;

export const ScrollableBlock = styled(Block)`
  align-self: stretch;
  grid-column: 1 / -1;
`;
