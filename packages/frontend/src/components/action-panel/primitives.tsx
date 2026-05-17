import { styled } from "@mui/material";
import type React from "react";
import { CANVAS_WRAPPER_CLASS_NAME } from "@/util";

const Root = styled("div")`
  --padding-width: 1rem;
  background-color: var(--discord-legacy-not-quite-black);
  border-radius: var(--card-border-radius);
  border: var(--card-border);
  display: grid;
  gap: 0.5rem;
  grid-template-rows: auto 1fr;
  height: 100%;
  min-height: 0;
  overflow-y: auto; // Fallback property, should appear before overflow-block
  overflow-block: auto;
  padding: var(--padding-width);

  #${CANVAS_WRAPPER_CLASS_NAME}:fullscreen &,
  #${CANVAS_WRAPPER_CLASS_NAME}:-webkit-full-screen & {
    height: auto;
    max-height: 100%;
  }

  > * {
    border-radius: calc(var(--card-border-radius) - var(--padding-width));
  }

  ${({ theme }) => theme.breakpoints.down("md")} {
    border-radius: 0;
    border: unset;
  }
`;

const TabBar = styled("div")`
  border-radius: 0.5rem;
  display: grid;
  gap: 0.5rem;
  grid-template-columns: repeat(3, 1fr);
`;

const Tab = styled("button")`
  appearance: none;
  border: none;
  color: inherit;
  font-family: inherit;
  font-size: inherit;
  font-style: inherit;
  line-height: inherit;

  background-color: var(--discord-legacy-not-quite-black);
  border-radius: inherit;
  cursor: pointer;
  font-weight: 500;
  letter-spacing: 0.005rem;
  padding: 0.5rem 1rem;
  place-items: center;
  text-align: center;
  touch-action: manipulation;
  transition-duration: var(--transition-duration-fast);
  transition-property: background, color, outline;
  transition-timing-function: ease;
  user-select: none;

  /*
  * Workaround for accessibility issue with VoiceOver.
  * See https://gerardkcohen.me/writing/2017/voiceover-list-style-type.html
  */
  &::before {
    content: "\\200B"; /* zero-width space */
  }

  &[aria-selected="true"] {
    background-color: var(--discord-legacy-dark-but-not-black);
  }

  &[aria-disabled="true"] {
    cursor: not-allowed;
    opacity: 0.5;
    pointer-events: none;
  }

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      background-color: var(--discord-legacy-dark-but-not-black);
    }
  }

  &:focus-visible {
    background-color: var(--discord-legacy-dark-but-not-black);
    outline: var(--focus-outline);
  }

  &:active {
    background-color: var(--discord-legacy-greyple);
  }
`;

const SectionHeading = styled("h2")`
  color: oklch(from var(--discord-white) l c h / 60%);
  font-weight: 600;
  font-size: 1rem;
  grid-column: 1 / -1;
  letter-spacing: 0.08em;
  margin-block: 2rem 0.5rem;
  text-transform: uppercase;
`;

function GenericTab<TabKey extends string>({
  tabKey,
  onSwitchTab,
  ...props
}: {
  tabKey: TabKey;
  onSwitchTab: (tabKey: TabKey) => void;
} & React.ComponentPropsWithRef<typeof Tab>) {
  return (
    <Tab
      onClick={() => onSwitchTab(tabKey)}
      onKeyUp={(event) => {
        if (event.key === "Enter" || event.key === " ") onSwitchTab(tabKey);
      }}
      {...props}
      role="tab"
    />
  );
}

const ActionPanelPrimitives = {
  Root,
  TabBar,
  Tab,
  SectionHeading,
  GenericTab,
} as const;

export default ActionPanelPrimitives;
