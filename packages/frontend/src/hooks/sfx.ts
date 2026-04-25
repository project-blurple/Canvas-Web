import { useCallback } from "react";
import useLocalStorage from "@/app/settings/useLocalStorage";

function noop() {}

export function usePlaySound(
  stem: "cooldown_notification" | "pick_color" | "place_pixel",
  options: { enabled?: boolean } = {},
) {
  const { enabled } = options;
  const [globallyEnabled] = useLocalStorage("sound-fx");
  const play = useCallback(
    () =>
      void new Audio(`/audio/${stem}.ogg`).play().catch(
        noop, // Ignore playback failures from browser autoplay rules.
      ),
    [stem],
  );

  // If `enabled` option is explicitly provided, it takes precedence…
  if (typeof enabled === "undefined") return enabled ? play : noop;
  // …otherwise defer to user preference
  return globallyEnabled ? play : noop;
}

export function usePlayCooldownExpirySound() {
  const [enabled] = useLocalStorage("cooldown-jingle");
  return usePlaySound("cooldown_notification", { enabled });
}
