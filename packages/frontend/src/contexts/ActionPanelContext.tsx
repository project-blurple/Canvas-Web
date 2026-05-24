"use client";

import type { PaletteColor } from "@blurple-canvas-web/types";
import {
  createContext,
  type Dispatch,
  type SetStateAction,
  useContext,
  useEffect,
  useState,
} from "react";
import { useCanvasCooldown, usePlayCooldownExpirySound } from "@/hooks";
import { useAuthContext } from "./AuthProvider";
import { useCanvasContext } from "./CanvasContext";

type TabKey = "look" | "place" | "frame";

interface ActionPanelContextType {
  areTabsLocked: boolean;
  cooldownEndTime: number | null;
  currentTab: TabKey;
  isFullscreenPanelVisible: boolean;
  setAreTabsLocked: Dispatch<SetStateAction<boolean>>;
  setCooldownEndTime: Dispatch<SetStateAction<number | null>>;
  setCurrentTab: Dispatch<SetStateAction<TabKey>>;
  setFullscreenPanelVisible: Dispatch<SetStateAction<boolean>>;
  setTempColor: Dispatch<SetStateAction<PaletteColor | null>>;
  tempColor: PaletteColor | null;
}

const ActionPanelContext = createContext<ActionPanelContextType>({
  areTabsLocked: false,
  cooldownEndTime: null,
  currentTab: "place",
  isFullscreenPanelVisible: false,
  setAreTabsLocked: () => {},
  setCooldownEndTime: () => {},
  setCurrentTab: () => {},
  setFullscreenPanelVisible: () => {},
  setTempColor: () => {},
  tempColor: null,
});

interface ActionPanelProviderProps {
  children: React.ReactNode;
}

export const ActionPanelProvider = ({ children }: ActionPanelProviderProps) => {
  const { canvas } = useCanvasContext();
  const { user } = useAuthContext();

  const [currentTab, setCurrentTab] = useState<TabKey>("place");
  const [tempColor, setTempColor] = useState<PaletteColor | null>(null);
  const [areTabsLocked, setAreTabsLocked] = useState(false);
  const [isFullscreenPanelVisible, setFullscreenPanelVisible] = useState(false);

  // Tracks the end time of the most recent pixel placement cooldown
  const [placementCooldownEndTime, setPlacementCooldownEndTime] = useState<
    number | null
  >(null);

  // Reset the placement cooldown during render when the canvas changes, rather
  // than from an effect. See https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [previousCanvasId, setPreviousCanvasId] = useState(canvas.id);
  if (previousCanvasId !== canvas.id) {
    setPreviousCanvasId(canvas.id);
    setPlacementCooldownEndTime(null);
  }

  const { data: cooldownData } = useCanvasCooldown(canvas.id, {
    enabled: Boolean(user),
  });

  // Effective cooldown: whichever of the API result or last placement expires later
  const queryCooldownEndTime = cooldownData?.cooldownEndTime ?? null;
  const cooldownEndTime =
    Math.max(queryCooldownEndTime ?? 0, placementCooldownEndTime ?? 0) || null;

  const playCooldownExpirySound = usePlayCooldownExpirySound();

  // Play jingle exactly once when cooldown expires
  useEffect(() => {
    if (!cooldownEndTime) return;
    const remaining = cooldownEndTime - Date.now();
    if (remaining <= 0) return;
    const id = setTimeout(playCooldownExpirySound, remaining);
    return () => clearTimeout(id);
  }, [cooldownEndTime, playCooldownExpirySound]);

  const value = {
    areTabsLocked,
    cooldownEndTime,
    currentTab,
    isFullscreenPanelVisible,
    setAreTabsLocked,
    setCooldownEndTime: setPlacementCooldownEndTime,
    setCurrentTab,
    setFullscreenPanelVisible,
    setTempColor,
    tempColor,
  };

  return (
    <ActionPanelContext.Provider value={value}>
      {children}
    </ActionPanelContext.Provider>
  );
};

export const useActionPanelContext = () => useContext(ActionPanelContext);
