"use client";

import {
  createContext,
  Dispatch,
  ReactNode,
  SetStateAction,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const AUDIO_STORAGE_KEY = "blurple-canvas-web-audio-settings";

interface AudioSettings {
  playSounds: boolean;
  cooldownExpiryJingle: boolean;
}

interface AudioContextType extends AudioSettings {
  setPlaySounds: Dispatch<SetStateAction<boolean>>;
  setCooldownExpiryJingle: Dispatch<SetStateAction<boolean>>;
}

const defaultAudioSettings: AudioSettings = {
  playSounds: true,
  cooldownExpiryJingle: true,
};

const AudioContext = createContext<AudioContextType>({
  ...defaultAudioSettings,
  setPlaySounds: () => {},
  setCooldownExpiryJingle: () => {},
});

function readAudioSettingsFromStorage(): AudioSettings {
  if (typeof window === "undefined") {
    return defaultAudioSettings;
  }

  try {
    const storedSettings = window.localStorage.getItem(AUDIO_STORAGE_KEY);

    if (!storedSettings) {
      return defaultAudioSettings;
    }

    const parsedSettings = JSON.parse(storedSettings) as Partial<AudioSettings>;

    return {
      playSounds: parsedSettings.playSounds ?? defaultAudioSettings.playSounds,
      cooldownExpiryJingle:
        parsedSettings.cooldownExpiryJingle ??
        defaultAudioSettings.cooldownExpiryJingle,
    };
  } catch {
    return defaultAudioSettings;
  }
}

export function AudioProvider({ children }: { children: ReactNode }) {
  const [playSounds, setPlaySounds] = useState(defaultAudioSettings.playSounds);
  const [cooldownExpiryJingle, setCooldownExpiryJingle] = useState(
    defaultAudioSettings.cooldownExpiryJingle,
  );
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    const storedSettings = readAudioSettingsFromStorage();

    setPlaySounds(storedSettings.playSounds);
    setCooldownExpiryJingle(storedSettings.cooldownExpiryJingle);
    setHasHydrated(true);
  }, []);

  useEffect(() => {
    if (!hasHydrated || typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      AUDIO_STORAGE_KEY,
      JSON.stringify({
        playSounds,
        cooldownExpiryJingle,
      }),
    );
  }, [cooldownExpiryJingle, hasHydrated, playSounds]);

  const value = useMemo(
    () => ({
      playSounds,
      cooldownExpiryJingle,
      setPlaySounds,
      setCooldownExpiryJingle,
    }),
    [cooldownExpiryJingle, playSounds],
  );

  return (
    <AudioContext.Provider value={value}>{children}</AudioContext.Provider>
  );
}

export const useAudioContext = () => useContext(AudioContext);
