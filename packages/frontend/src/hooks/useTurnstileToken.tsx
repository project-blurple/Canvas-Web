"use client";

import type { TurnstileInstance } from "@marsidev/react-turnstile";
import { Turnstile } from "@marsidev/react-turnstile";
import { useCallback, useRef } from "react";
import config from "@/config/clientConfig";

export default function useTurnstileToken(enabled: boolean) {
  const turnstileRef = useRef<TurnstileInstance | null>(null);

  const getToken = useCallback(async (): Promise<string | undefined> => {
    if (!enabled || !config.turnstileSiteKey) return undefined;

    const inst = turnstileRef.current;
    if (!inst) return undefined;

    inst.execute();
    const token = inst.getResponse();
    // leave token lifecycle to the consumer; they can call reset() if desired
    return token ?? undefined;
  }, [enabled]);

  const turnstileElement =
    enabled && config.turnstileSiteKey ?
      <Turnstile
        ref={turnstileRef}
        siteKey={config.turnstileSiteKey}
        options={{ size: "invisible" }}
        style={{
          position: "absolute",
          left: -9999,
          top: 0,
          width: 0,
          height: 0,
          overflow: "hidden",
        }}
        aria-hidden
      />
    : null;

  return {
    turnstileElement,
    getToken,
    ref: turnstileRef,
  } as const;
}
