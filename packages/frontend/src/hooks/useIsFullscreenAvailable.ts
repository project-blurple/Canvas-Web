"use client";

import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useEffect, useState } from "react";

export function useIsFullscreenAvailable(): boolean {
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down("md"));
  const [supportsFullscreen, setSupportsFullscreen] = useState(false);

  useEffect(() => {
    const fullscreenDocument = document as Document & {
      webkitFullscreenEnabled?: boolean;
    };
    const fullscreenElement =
      typeof HTMLElement !== "undefined" ? HTMLElement.prototype : null;

    setSupportsFullscreen(
      document.fullscreenEnabled ||
        !!fullscreenDocument.webkitFullscreenEnabled ||
        (!!fullscreenElement && "webkitRequestFullscreen" in fullscreenElement),
    );
  }, []);

  return !isSmall && supportsFullscreen;
}
