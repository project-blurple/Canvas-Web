"use client";

import {
  type CanvasInfo,
  type CanvasInfoRequest,
  SocketEvents,
} from "@blurple-canvas-web/types";
import { useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import config from "@/config/clientConfig";
import { socket } from "@/socket";
import { useSelectedColorContext } from "./SelectedColorContext";
import { useSelectedFrameContext } from "./SelectedFrameContext";

function useSubscribeToCanvasUpdates() {
  const queryClient = useQueryClient();
  useEffect(() => {
    const onCanvasUpdate = () => {
      void queryClient.invalidateQueries({ queryKey: ["canvas"] });
      void queryClient.invalidateQueries({ queryKey: ["canvasInfo"] });
    };

    socket.on(SocketEvents.canvasUpdate, onCanvasUpdate);
    return () => void socket.off(SocketEvents.canvasUpdate, onCanvasUpdate);
  }, [queryClient]);
}

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
    cooldownDuration: 0,
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

  useEffect(() => {
    socket.auth = {
      canvasId: mainCanvasInfo.id,
      pixelTimestamp: new Date().toISOString(),
    };
    socket.connect();
    return () => void socket.disconnect();
  }, [mainCanvasInfo.id]);

  useSubscribeToCanvasUpdates();

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

      if (canvasId !== activeCanvas.id) {
        if (socket.connected) {
          socket.disconnect();
        }
        socket.connect();
      }
    },
    [activeCanvas.id, router, setColor, setFrame, mainCanvasInfo.id],
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
