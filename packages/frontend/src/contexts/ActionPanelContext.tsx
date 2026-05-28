"use client";

import type { Cooldown, PaletteColor } from "@blurple-canvas-web/types";
import { useQueryClient } from "@tanstack/react-query";
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
  setCooldownEndTime: (value: number | null) => void;
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
  const queryClient = useQueryClient();

  const [currentTab, setCurrentTab] = useState<TabKey>("place");
  const [tempColor, setTempColor] = useState<PaletteColor | null>(null);
  const [areTabsLocked, setAreTabsLocked] = useState(false);
  const [isFullscreenPanelVisible, setFullscreenPanelVisible] = useState(false);

  const { data: cooldownData } = useCanvasCooldown(canvas.id, {
    enabled: Boolean(user),
  });

  const cooldownEndTime = cooldownData?.cooldownEndTime ?? null;

  const setCooldownEndTime = (value: number | null) => {
    queryClient.setQueryData<Cooldown>(["canvasCooldown", canvas.id], {
      cooldownEndTime: value ?? undefined,
    });
  };

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
    setCooldownEndTime,
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
