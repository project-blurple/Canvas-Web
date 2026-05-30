"use client";

import { type CanvasInfo, SocketEvents } from "@blurple-canvas-web/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { createContext, useContext, useEffect } from "react";
import { fetchCanvasInfo } from "@/hooks/queries/serverFetch";
import { socket } from "@/socket";

interface CanvasContextType {
  canvas: CanvasInfo;
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
});

interface CanvasProviderProps {
  children: React.ReactNode;
  mainCanvasInfo: CanvasInfo;
}

export const CanvasProvider = ({
  children,
  mainCanvasInfo,
}: CanvasProviderProps) => {
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

  return (
    <CanvasContext.Provider value={{ canvas: activeCanvas }}>
      {children}
    </CanvasContext.Provider>
  );
};

export const useCanvasContext = () => useContext(CanvasContext);
