"use client";

import { useMemo } from "react";

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
