"use client";

import { type CanvasInfo, SocketEvents } from "@blurple-canvas-web/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect } from "react";
import { fetchCanvasInfo } from "@/hooks/queries/serverFetch";
import { socket } from "@/socket";
import { useSelectedColorContext } from "./SelectedColorContext";
import { useSelectedFrameContext } from "./SelectedFrameContext";

interface CanvasContextType {
  canvas: CanvasInfo;
  setCanvas: (canvasId: CanvasInfo["id"]) => Promise<void>;
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
  const params = useParams();

  const canvasId =
    params?.canvasId ?
      Number(decodeURIComponent(params.canvasId as string))
    : mainCanvasInfo.id;

  const { data: activeCanvas = mainCanvasInfo } = useQuery({
    queryKey: ["canvasInfo", canvasId],
    queryFn: () => fetchCanvasInfo(canvasId),
    initialData: canvasId === mainCanvasInfo.id ? mainCanvasInfo : undefined,
  });

  const { setColor } = useSelectedColorContext();
  const { setFrame } = useSelectedFrameContext();

  useEffect(() => {
    const onCanvasUpdate = (_canvas: CanvasInfo) => {
      void queryClient.invalidateQueries({ queryKey: ["canvas"] });
      void queryClient.invalidateQueries({ queryKey: ["canvasInfo"] });
    };

    socket.on(SocketEvents.canvasUpdate, onCanvasUpdate);

    return () => {
      socket.off(SocketEvents.canvasUpdate, onCanvasUpdate);
    };
  }, [queryClient]);

  // When we connect, we want to make sure any pixels placed since now get included in the
  // response. This is because in the time it takes for the image to load some pixels may have
  // already been placed.
  useEffect(() => {
    socket.auth = {
      canvasId,
      pixelTimestamp: new Date().toISOString(),
    };

    if (socket.connected) {
      socket.disconnect();
    }
    socket.connect();

    return () => {
      socket.disconnect();
    };
  }, [canvasId]);

  const setCanvasById = useCallback<CanvasContextType["setCanvas"]>(
    async (newCanvasId: CanvasInfo["id"]) => {
      setColor(null);
      setFrame(null);
      router.push(`/canvas/${encodeURIComponent(newCanvasId)}`);
    },
    [router, setColor, setFrame],
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
