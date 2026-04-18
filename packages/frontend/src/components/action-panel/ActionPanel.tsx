"use client";

import { PaletteColor } from "@blurple-canvas-web/types";
import { css, styled } from "@mui/material";
import { useState } from "react";
import {
  useCanvasContext,
  useCanvasViewContext,
  useSelectedColorContext,
} from "@/contexts";
import { PixelInfoTab, PlacePixelTab } from "./tabs";
import FramesTab from "./tabs/FramesTab";

const Wrapper = styled("div")`
  --padding-width: 1rem;
  background-color: var(--discord-legacy-not-quite-black);
  border-radius: var(--card-border-radius);
  border: var(--card-border);
  display: grid;
  gap: 0.5rem;
  grid-template-rows: auto 1fr;
  overflow-y: auto; // Fallback property, should appear before overflow-block
  overflow-block: auto;
  padding: var(--padding-width);

  > * {
    border-radius: calc(var(--card-border-radius) - var(--padding-width));
  }

  ${({ theme }) => theme.breakpoints.down("md")} {
    border-radius: 0;
    border: initial;
  }
`;

const TabBar = styled("ul")`
  border-radius: 0.5rem;
  display: grid;
  gap: 0.5rem;
  grid-template-columns: repeat(3, 1fr);
  list-style-type: none;
`;

const TabStyle = styled("li")<{ active?: boolean; disabled?: boolean }>`
  background-color: var(--discord-legacy-not-quite-black);
  border-radius: inherit;
  cursor: pointer;
  font-weight: 500;
  letter-spacing: 0.005rem;
  padding: 0.5rem 1rem;
  place-items: center;
  text-align: center;
  touch-action: manipulation;
  transition:
    background-color var(--transition-duration-fast) ease,
    color var(--transition-duration-fast) ease,
    outline var(--transition-duration-fast) ease;
  user-select: none;

  ${({ active }) =>
    active ?
      css`
        background-color: var(--discord-legacy-dark-but-not-black);
      `
    : ""}

  ${({ disabled }) =>
    disabled ?
      css`
        cursor: not-allowed;
        opacity: 0.5;
        pointer-events: none;
      `
    : ""}

  /*
  * Workaround for accessibility issue with VoiceOver.
  * See https://gerardkcohen.me/writing/2017/voiceover-list-style-type.html
  */
  &::before {
    content: "\\200B"; /* zero-width space */
  }

  @media (hover: hover) and (pointer: fine) {
    :hover {
      background-color: var(--discord-legacy-dark-but-not-black);
    }
  }

  :focus-visible {
    background-color: var(--discord-legacy-dark-but-not-black);
    outline: var(--focus-outline);
  }

  :active {
    background-color: var(--discord-legacy-greyple);
  }
`;

export const Heading = styled("h2")`
  color: oklch(from var(--discord-white) l c h / 60%);
  font-weight: 600;
  font-size: 1rem;
  grid-column: 1 / -1;
  letter-spacing: 0.08em;
  margin-block: 2rem 0.5rem;
  text-transform: uppercase;
`;

enum TABS {
  LOOK = "Look",
  PLACE = "Place",
  FRAME = "Frame",
}

function Tab({
  tabKey,
  label,
  currentTab,
  isLocked,
  onSwitchTab,
}: {
  tabKey: TABS;
  label: string;
  currentTab: TABS;
  isLocked: boolean;
  onSwitchTab: (tab: TABS) => void;
}) {
  const isActive = currentTab === tabKey;

  return (
    <TabStyle
      active={isActive}
      onClick={() => onSwitchTab(tabKey)}
      onKeyUp={(event) => {
        if (event.key === "Enter" || event.key === " ") onSwitchTab(tabKey);
      }}
      tabIndex={0}
      disabled={isLocked}
    >
      {label}
    </TabStyle>
  );
}

export default function ActionPanel() {
  const [currentTab, setCurrentTab] = useState(TABS.PLACE);
  const [tempColor, setTempColor] = useState<PaletteColor | null>(null);
  const [tabsLocked, setTabsLocked] = useState(false);

  const { color, setColor } = useSelectedColorContext();
  const { canvas } = useCanvasContext();
  const { setIsReticleVisible } = useCanvasViewContext();

  const onSwitchTab = (newTab: TABS) => {
    if (tabsLocked) return;

    // switching tabs
    setCurrentTab(newTab);

    // hiding colour from reticle if we are on look tab
    if (newTab === TABS.LOOK) {
      setTempColor(color);
      setColor(null);
    } else {
      setColor(tempColor);
    }

    // hiding reticle if we are on frames tab
    setIsReticleVisible(newTab !== TABS.FRAME);
  };

  return (
    <Wrapper>
      <TabBar>
        <Tab
          tabKey={TABS.PLACE}
          label="Place"
          currentTab={currentTab}
          onSwitchTab={onSwitchTab}
          isLocked={tabsLocked && currentTab !== TABS.PLACE}
        />
        <Tab
          tabKey={TABS.LOOK}
          label="Look"
          currentTab={currentTab}
          onSwitchTab={onSwitchTab}
          isLocked={tabsLocked && currentTab !== TABS.LOOK}
        />
        <Tab
          tabKey={TABS.FRAME}
          label="Frame"
          currentTab={currentTab}
          onSwitchTab={onSwitchTab}
          isLocked={tabsLocked && currentTab !== TABS.FRAME}
        />
      </TabBar>
      <PlacePixelTab
        active={currentTab === TABS.PLACE}
        eventId={canvas.eventId}
      />
      <PixelInfoTab active={currentTab === TABS.LOOK} canvasId={canvas.id} />
      <FramesTab
        active={currentTab === TABS.FRAME}
        setTabsLocked={setTabsLocked}
      />
    </Wrapper>
  );
}
