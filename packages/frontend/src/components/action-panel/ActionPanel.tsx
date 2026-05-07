"use client";

import { styled } from "@mui/material";
import type React from "react";
import { useId } from "react";
import {
  useActionPanelContext,
  useCanvasContext,
  useCanvasViewContext,
  useSelectedColorContext,
} from "@/contexts";
import { CANVAS_WRAPPER_CLASS_NAME } from "@/util";
import { PixelInfoTab, PlacePixelTab } from "./tabs";
import FramesTab from "./tabs/FramesTab";

export const ActionPanelWrapper = styled("div")`
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

export const TabBar = styled("div")`
  border-radius: 0.5rem;
  display: grid;
  gap: 0.5rem;
  grid-template-columns: repeat(3, 1fr);
`;

export const StyledTab = styled("button")`
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

export const Heading = styled("h2")`
  color: oklch(from var(--discord-white) l c h / 60%);
  font-weight: 600;
  font-size: 1rem;
  grid-column: 1 / -1;
  letter-spacing: 0.08em;
  margin-block: 2rem 0.5rem;
  text-transform: uppercase;
`;

type TabKey = "look" | "place" | "frame";

const Tab = GenericTab<TabKey>;

export function GenericTab<TabKey extends string>({
  tabKey,
  onSwitchTab,
  ...props
}: {
  tabKey: TabKey;
  onSwitchTab: (tabKey: TabKey) => void;
} & React.ComponentPropsWithRef<typeof StyledTab>) {
  return (
    <StyledTab
      onClick={() => onSwitchTab(tabKey)}
      onKeyUp={(event) => {
        if (event.key === "Enter" || event.key === " ") onSwitchTab(tabKey);
      }}
      {...props}
      role="tab"
    />
  );
}

export default function ActionPanel() {
  const {
    areTabsLocked,
    currentTab,
    setAreTabsLocked,
    setCurrentTab,
    setTempColor,
    tempColor,
  } = useActionPanelContext();

  const { color, setColor } = useSelectedColorContext();
  const { canvas } = useCanvasContext();
  const { setIsReticleVisible } = useCanvasViewContext();

  const onSwitchTab = (newTab: TabKey) => {
    if (areTabsLocked) return;

    setCurrentTab(newTab);

    // hiding colour from reticle if we are on look tab
    if (newTab === "look") {
      setTempColor(color);
      setColor(null);
    } else {
      setColor(tempColor);
    }

    // hiding reticle if we are on frames tab
    setIsReticleVisible(newTab !== "frame");
  };

  const placeTabId = useId();
  const lookTabId = useId();
  const frameTabId = useId();

  return (
    <ActionPanelWrapper>
      <TabBar role="tablist">
        <Tab
          aria-controls={placeTabId}
          aria-disabled={areTabsLocked && currentTab !== "place"}
          aria-selected={currentTab === "place"}
          tabKey="place"
          onSwitchTab={onSwitchTab}
        >
          Place
        </Tab>
        <Tab
          aria-controls={lookTabId}
          aria-disabled={areTabsLocked && currentTab !== "look"}
          aria-selected={currentTab === "look"}
          tabKey="look"
          onSwitchTab={onSwitchTab}
        >
          Look
        </Tab>
        <Tab
          aria-controls={frameTabId}
          aria-disabled={areTabsLocked && currentTab !== "frame"}
          aria-selected={currentTab === "frame"}
          tabKey="frame"
          onSwitchTab={onSwitchTab}
        >
          Frame
        </Tab>
      </TabBar>
      <PlacePixelTab
        active={currentTab === "place"}
        eventId={canvas.eventId}
        id={placeTabId}
      />
      <PixelInfoTab
        active={currentTab === "look"}
        canvasId={canvas.id}
        id={lookTabId}
      />
      <FramesTab
        active={currentTab === "frame"}
        id={frameTabId}
        setTabsLocked={setAreTabsLocked}
      />
    </ActionPanelWrapper>
  );
}
