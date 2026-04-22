"use client";

import {
  useCanvasContext,
  useCanvasViewContext,
  useSelectedColorContext,
} from "@/contexts";
import { PaletteColor } from "@blurple-canvas-web/types";
import { styled } from "@mui/material";
import React, { useState } from "react";
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
    border: unset;
  }
`;

const TabBar = styled("ul")`
  border-radius: 0.5rem;
  display: grid;
  gap: 0.5rem;
  grid-template-columns: repeat(3, 1fr);
  list-style-type: none;
`;

const StyledTab = styled("li")`
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

function Tab({
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
    />
  );
}

export default function ActionPanel() {
  const [currentTab, setCurrentTab] = useState("place");
  const [tempColor, setTempColor] = useState<PaletteColor | null>(null);

  const { color, setColor } = useSelectedColorContext();
  const { canvas } = useCanvasContext();
  const { setIsReticleVisible } = useCanvasViewContext();

  const onSwitchTab = (newTab: TabKey) => {
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

  return (
    <Wrapper>
      <TabBar>
        <Tab
          aria-selected={currentTab === "place"}
          tabKey="place"
          onSwitchTab={onSwitchTab}
        >
          Place
        </Tab>
        <Tab
          aria-selected={currentTab === "look"}
          tabKey="look"
          onSwitchTab={onSwitchTab}
        >
          Look
        </Tab>
        <Tab
          aria-selected={currentTab === "frame"}
          tabKey="frame"
          onSwitchTab={onSwitchTab}
        >
          Frame
        </Tab>
      </TabBar>
      <PlacePixelTab active={currentTab === "place"} eventId={canvas.eventId} />
      <PixelInfoTab active={currentTab === "look"} canvasId={canvas.id} />
      <FramesTab active={currentTab === "frame"} canvasId={canvas.id} />
    </Wrapper>
  );
}
