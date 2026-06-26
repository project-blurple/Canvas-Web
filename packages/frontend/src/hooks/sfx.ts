import { useCallback, useRef } from "react";
import useLocalStorage from "@/app/settings/useLocalStorage";
import { clamp } from "@/util";

function noop() {}

/**
 * Convert volume setting (0-100) to Audio.volume range (0.0-1.0).
 */
function volumeToAudioLevel(volume: number | undefined): number {
  return clamp(volume ?? 75, 0, 100) / 100;
}

export function usePlaySound(
  stem: "cooldown_notification" | "pick_color" | "place_pixel",
  options: { enabled?: boolean; volume?: number } = {},
) {
  const { enabled, volume: volumeOption } = options;
  const [globallyEnabled] = useLocalStorage("audio/sound-fx");
  const [volumeFromStorage] = useLocalStorage("audio/sound-fx/volume");
  const volume = volumeOption ?? volumeFromStorage;
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const volumeRef = useRef(volume);
  volumeRef.current = volume;

  const play = useCallback(() => {
    const audio = new Audio(`/audio/${stem}.ogg`);
    audio.volume = volumeToAudioLevel(volumeRef.current);
    audioRef.current = audio;
    void audio.play().catch(
      noop, // Ignore playback failures from browser autoplay rules.
    );
  }, [stem]);

  // If `enabled` option is explicitly provided, it takes precedence…
  const playOrNoop =
    typeof enabled !== "undefined" ?
      enabled ? play
      : noop
    : globallyEnabled ? play
    : noop;

  return { play: playOrNoop, audioRef };
}

export function usePlayCooldownExpirySound() {
  const [enabled] = useLocalStorage("audio/cooldown-jingle");
  const [volume] = useLocalStorage("audio/cooldown-jingle/volume");

  return usePlaySound("cooldown_notification", { enabled, volume });
}
