"use client";

import { useMemo } from "react";

/**
 * Detects WebKit browsers (Safari) to disable transition animations that cause
 * blurry canvas rendering.
 * @see https://bugs.webkit.org/show_bug.cgi?id=27684
 * If the user spoofs their user agent, this is not my problem.
 */
export default function useIsWebKit(): boolean {
  return useMemo(() => {
    const { userAgent: ua, vendor } = navigator;
    const isProbablyWebKit =
      vendor === "Apple Computer, Inc." ||
      ua.includes("AppleWebKit/") ||
      ua.includes("Safari/");
    const isNotChromium = !ua.includes("Chrome/") && !ua.includes("Chromium/");
    return isProbablyWebKit && isNotChromium;
  }, []);
}
