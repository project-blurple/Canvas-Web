"use client";

import {
  CanvasInfo,
  CanvasInfoRequest,
  Point,
} from "@blurple-canvas-web/types";
import axios from "axios";
import { useRouter } from "next/navigation";
import {
  createContext,
  Dispatch,
  RefObject,
  SetStateAction,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { addPoints, tupleToPoint } from "@/components/canvas/point";
import config from "@/config";
import { socket } from "@/socket";
import { useSelectedColorContext } from "./SelectedColorContext";
import { useSelectedFrameContext } from "./SelectedFrameContext";

interface CanvasContextType {
  adjustedCoords: Point | null;
  canvas: CanvasInfo;
  containerRef: RefObject<HTMLDivElement | null>;
  coords: Point | null;
  isReticleVisible: boolean;
  zoom: number;
  setCanvas: (canvasId: CanvasInfo["id"]) => Promise<void>;
  setCoords: Dispatch<SetStateAction<Point | null>>;
  setIsReticleVisible: Dispatch<SetStateAction<boolean>>;
  setZoom: Dispatch<SetStateAction<number>>;
}

export const CanvasContext = createContext<CanvasContextType>({
  adjustedCoords: null,
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
  containerRef: { current: null },
  coords: null,
  isReticleVisible: false,
  zoom: 1,
  setCoords: () => {},
  setCanvas: async () => {},
  setZoom: () => {},
  setIsReticleVisible: () => {},
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
  const [selectedCoords, setSelectedCoords] =
    useState<CanvasContextType["coords"]>(null);
  const [isReticleVisible, setIsReticleVisible] =
    useState<CanvasContextType["isReticleVisible"]>(true);
  const [zoom, setZoom] = useState(1);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const adjustedCoords = useMemo(() => {
    if (selectedCoords) {
      return addPoints(
        selectedCoords,
        tupleToPoint(activeCanvas.startCoordinates),
      );
    }

    return null;
  }, [activeCanvas.startCoordinates, selectedCoords]);

  const { setColor: setSelectedColor } = useSelectedColorContext();
  const [, setSelectedFrame] = useSelectedFrameContext();

  const setCanvasById = useCallback<CanvasContextType["setCanvas"]>(
    async (canvasId: CanvasInfo["id"]) => {
      const response = await axios.get<CanvasInfoRequest.ResBody>(
        `${config.apiUrl}/api/v1/canvas/${encodeURIComponent(canvasId)}/info`,
      );
      setActiveCanvas(response.data);
      setSelectedColor(null);
      setSelectedCoords(null);
      setSelectedFrame(null);

      const url = new URL(window.location.href);
      url.pathname =
        canvasId === mainCanvasInfo.id ? "/" : `/canvas/${canvasId}`;
      url.search = "";
      router.replace(`${url.pathname}${url.search}${url.hash}`);

      // When we load an image, we want to make sure any pixels placed since now get included in the
      // response. This is because in the time it takes for the image to load some pixels may have
      // already been placed.
      socket.auth = {
        canvasId,
        pixelTimestamp: new Date().toISOString(),
      };
    },
    [router, setSelectedColor, setSelectedFrame, mainCanvasInfo.id],
  );

  return (
    <CanvasContext.Provider
      value={{
        adjustedCoords,
        canvas: activeCanvas,
        isReticleVisible: isReticleVisible && selectedCoords !== null,
        containerRef: containerRef,
        coords: selectedCoords,
        zoom: zoom,
        setCoords: setSelectedCoords,
        setCanvas: setCanvasById,
        setIsReticleVisible: setIsReticleVisible,
        setZoom: setZoom,
      }}
    >
      {children}
    </CanvasContext.Provider>
  );
};

export const useCanvasContext = () => useContext(CanvasContext);
