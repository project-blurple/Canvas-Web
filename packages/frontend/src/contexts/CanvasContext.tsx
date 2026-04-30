"use client";

import type { CanvasInfo, CanvasInfoRequest } from "@blurple-canvas-web/types";
import axios from "axios";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useState } from "react";
import config from "@/config";
import { socket } from "@/socket";
import { useSelectedColorContext } from "./SelectedColorContext";
import { useSelectedFrameContext } from "./SelectedFrameContext";

interface CanvasContextType {
  canvas: CanvasInfo;
  setCanvas: (canvasId: CanvasInfo["id"], redirect?: boolean) => Promise<void>;
}

const CanvasContext = createContext<CanvasContextType>({
  canvas: {
    id: -1,
    name: "",
    width: 0,
    height: 0,
    startCoordinates: [0, 0],
    isLocked: false,
    eventId: null,
    webPlacingEnabled: false,
    allColorsGlobal: false,
  },
  setCanvas: async () => {},
});

interface CanvasProviderProps {
  children: React.ReactNode;
  mainCanvasInfo: CanvasInfo;
}

export const CanvasProvider = ({
  children,
  mainCanvasInfo,
}: CanvasProviderProps) => {
  const router = useRouter();
  const [activeCanvas, setActiveCanvas] = useState(mainCanvasInfo);

  const { setColor } = useSelectedColorContext();
  const { setFrame } = useSelectedFrameContext();

  const setCanvasById = useCallback<CanvasContextType["setCanvas"]>(
    async (canvasId: CanvasInfo["id"], redirect: boolean = true) => {
      const response = await axios.get<CanvasInfoRequest.ResBody>(
        `${config.apiUrl}/api/v1/canvas/${encodeURIComponent(canvasId)}/info`,
      );
      setActiveCanvas(response.data);
      setColor(null);
      setFrame(null);

      if (redirect) {
        const url = new URL(window.location.href);
        url.pathname =
          canvasId === mainCanvasInfo.id ?
            "/"
          : `/canvas/${encodeURIComponent(canvasId)}`;
        url.search = "";
        router.replace(`${url.pathname}${url.search}${url.hash}`);
      }

      // When we load an image, we want to make sure any pixels placed since now get included in the
      // response. This is because in the time it takes for the image to load some pixels may have
      // already been placed.
      socket.auth = {
        canvasId,
        pixelTimestamp: new Date().toISOString(),
      };
    },
    [router, setColor, setFrame, mainCanvasInfo.id],
  );

  return (
    <CanvasContext.Provider
      value={{
        canvas: activeCanvas,
        setCanvas: setCanvasById,
      }}
    >
      {children}
    </CanvasContext.Provider>
  );
};

export const useCanvasContext = () => useContext(CanvasContext);
