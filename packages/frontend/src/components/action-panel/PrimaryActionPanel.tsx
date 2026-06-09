"use client";

import { useId } from "react";
import { useActionPanelContext } from "@/contexts/ActionPanelContext";
import { useCanvasContext } from "@/contexts/CanvasContext";
import { useCanvasViewContext } from "@/contexts/CanvasViewContext";
import { useSelectedColorContext } from "@/contexts/SelectedColorContext";
import ActionPanelPrimitives from "./primitives";
import FramesTab from "./tabs/FramesTab";
import PixelInfoTab from "./tabs/PixelInfoTab";
import PlacePixelTab from "./tabs/place/PlacePixelTab";

type TabKey = "look" | "place" | "frame";

export default function PrimaryActionPanel() {
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
    <ActionPanelPrimitives.Root>
      <ActionPanelPrimitives.TabBar role="tablist">
        <ActionPanelPrimitives.GenericTab
          aria-controls={placeTabId}
          aria-disabled={areTabsLocked && currentTab !== "place"}
          aria-selected={currentTab === "place"}
          tabKey="place"
          onSwitchTab={onSwitchTab}
        >
          Place
        </ActionPanelPrimitives.GenericTab>
        <ActionPanelPrimitives.GenericTab
          aria-controls={lookTabId}
          aria-disabled={areTabsLocked && currentTab !== "look"}
          aria-selected={currentTab === "look"}
          tabKey="look"
          onSwitchTab={onSwitchTab}
        >
          Look
        </ActionPanelPrimitives.GenericTab>
        <ActionPanelPrimitives.GenericTab
          aria-controls={frameTabId}
          aria-disabled={areTabsLocked && currentTab !== "frame"}
          aria-selected={currentTab === "frame"}
          tabKey="frame"
          onSwitchTab={onSwitchTab}
        >
          Frame
        </ActionPanelPrimitives.GenericTab>
      </ActionPanelPrimitives.TabBar>
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
    </ActionPanelPrimitives.Root>
  );
}
