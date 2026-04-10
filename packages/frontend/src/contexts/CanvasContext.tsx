"use client";

import {
  CanvasInfo,
  CanvasInfoRequest,
  Frame,
  Point,
} from "@blurple-canvas-web/types";
import axios from "axios";
import {
  createContext,
  Dispatch,
  SetStateAction,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { addPoints, tupleToPoint } from "@/components/canvas/point";
import config from "@/config";
import { socket } from "@/socket";
import { useSelectedColorContext } from "./SelectedColorContext";

interface CanvasContextType {
  canvas: CanvasInfo;
  coords: Point | null;
  selectedFrame: Frame | null;
  adjustedCoords: Point | null;
  setCanvas: (canvasId: CanvasInfo["id"]) => void;
  setCoords: Dispatch<SetStateAction<Point | null>>;
  setSelectedFrame: Dispatch<SetStateAction<Frame | null>>;
}

export const CanvasContext = createContext<CanvasContextType>({
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
  coords: null,
  selectedFrame: null,
  adjustedCoords: null,
  setCoords: () => {},
  setCanvas: () => {},
  setSelectedFrame: () => {},
});

interface CanvasProviderProps {
  children: React.ReactNode;
  mainCanvasInfo: CanvasInfo;
}

export const CanvasProvider = ({
  children,
  mainCanvasInfo,
}: CanvasProviderProps) => {
  const [activeCanvas, setActiveCanvas] = useState(mainCanvasInfo);
  const [selectedCoords, setSelectedCoords] =
    useState<CanvasContextType["coords"]>(null);
  const [selectedFrame, setSelectedFrame] =
    useState<CanvasContextType["selectedFrame"]>(null);

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

  const setCanvasById = useCallback<CanvasContextType["setCanvas"]>(
    async (canvasId: CanvasInfo["id"]) => {
      const response = await axios.get<CanvasInfoRequest.ResBody>(
        `${config.apiUrl}/api/v1/canvas/${encodeURIComponent(canvasId)}/info`,
      );
      setActiveCanvas(response.data);
      setSelectedColor(null);
      setSelectedCoords(null);
      setSelectedFrame(null);

      // When we load an image, we want to make sure any pixels placed since now get included in the
      // response. This is because in the time it takes for the image to load some pixels may have
      // already been placed.
      socket.auth = {
        canvasId,
        pixelTimestamp: new Date().toISOString(),
      };
    },
    [setSelectedColor],
  );

  return (
    <CanvasContext.Provider
      value={{
        coords: selectedCoords,
        adjustedCoords,
        canvas: activeCanvas,
        selectedFrame: selectedFrame,
        setCoords: setSelectedCoords,
        setCanvas: setCanvasById,
        setSelectedFrame: setSelectedFrame,
      }}
    >
      {children}
    </CanvasContext.Provider>
  );
};

export const useCanvasContext = () => useContext(CanvasContext);
