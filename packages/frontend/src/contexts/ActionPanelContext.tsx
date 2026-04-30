"use client";

import type { PaletteColor } from "@blurple-canvas-web/types";
import {
  createContext,
  type Dispatch,
  type SetStateAction,
  useContext,
  useMemo,
  useState,
} from "react";

export type TabKey = "look" | "place" | "frame";

interface ActionPanelContextType {
  areTabsLocked: boolean;
  currentTab: TabKey;
  isFullscreenPanelVisible: boolean;
  setAreTabsLocked: Dispatch<SetStateAction<boolean>>;
  setCurrentTab: Dispatch<SetStateAction<TabKey>>;
  setFullscreenPanelVisible: Dispatch<SetStateAction<boolean>>;
  setTempColor: Dispatch<SetStateAction<PaletteColor | null>>;
  tempColor: PaletteColor | null;
}

const ActionPanelContext = createContext<ActionPanelContextType>({
  areTabsLocked: false,
  currentTab: "place",
  isFullscreenPanelVisible: false,
  setAreTabsLocked: () => {},
  setCurrentTab: () => {},
  setFullscreenPanelVisible: () => {},
  setTempColor: () => {},
  tempColor: null,
});

interface ActionPanelProviderProps {
  children: React.ReactNode;
}

export const ActionPanelProvider = ({ children }: ActionPanelProviderProps) => {
  const [currentTab, setCurrentTab] = useState<TabKey>("place");
  const [tempColor, setTempColor] = useState<PaletteColor | null>(null);
  const [areTabsLocked, setAreTabsLocked] = useState(false);
  const [isFullscreenPanelVisible, setFullscreenPanelVisible] = useState(false);

  const value = useMemo(
    () => ({
      areTabsLocked,
      currentTab,
      isFullscreenPanelVisible,
      setAreTabsLocked,
      setCurrentTab,
      setFullscreenPanelVisible,
      setTempColor,
      tempColor,
    }),
    [areTabsLocked, currentTab, isFullscreenPanelVisible, tempColor],
  );

  return (
    <ActionPanelContext.Provider value={value}>
      {children}
    </ActionPanelContext.Provider>
  );
};

export const useActionPanelContext = () => useContext(ActionPanelContext);
