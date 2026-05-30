"use client";

import { type CanvasInfo, SocketEvents } from "@blurple-canvas-web/types";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { fetchCanvasInfo } from "@/hooks/queries/serverFetch";
import { socket } from "@/socket";
import { useSelectedColorContext } from "./SelectedColorContext";
import { useSelectedFrameContext } from "./SelectedFrameContext";

function buildSocketAuth<T extends CanvasInfo["id"]>(canvasId: T) {
  return {
    canvasId,
    pixelTimestamp: new Date().toISOString(),
  };
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
  const queryClient = useQueryClient();
  const [activeCanvas, setActiveCanvas] = useState(mainCanvasInfo);

  const { setColor } = useSelectedColorContext();
  const { setFrame } = useSelectedFrameContext();

  useEffect(() => {
    socket.auth = buildSocketAuth(mainCanvasInfo.id);
    socket.connect();

    return () => {
      socket.disconnect();
    };
  }, [mainCanvasInfo.id]);

  useEffect(() => {
    const onCanvasUpdate = (canvas: CanvasInfo) => {
      void queryClient.invalidateQueries({ queryKey: ["canvas"] });
      void queryClient.invalidateQueries({ queryKey: ["canvasInfo"] });

      if (canvas.id === activeCanvas.id) {
        setActiveCanvas(canvas);
      }
    };

    socket.on(SocketEvents.canvasUpdate, onCanvasUpdate);

    return () => {
      socket.off(SocketEvents.canvasUpdate, onCanvasUpdate);
    };
  }, [activeCanvas.id, queryClient]);

  const setCanvasById = useCallback<CanvasContextType["setCanvas"]>(
    async (canvasId: CanvasInfo["id"], redirect: boolean = true) => {
      const canvasInfo = await queryClient.fetchQuery({
        queryKey: ["canvasInfo", canvasId],
        queryFn: () => fetchCanvasInfo(canvasId),
      });
      setActiveCanvas(canvasInfo);
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
      socket.auth = buildSocketAuth(canvasId);

      if (canvasId !== activeCanvas.id) {
        if (socket.connected) {
          socket.disconnect();
        }
        socket.connect();
      }
    },
    [
      activeCanvas.id,
      mainCanvasInfo.id,
      queryClient,
      router,
      setColor,
      setFrame,
    ],
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
