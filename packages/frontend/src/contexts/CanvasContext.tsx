"use client";

import axios from "axios";
import {
  Dispatch,
  SetStateAction,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import { addPoints, tupleToPoint } from "@/components/canvas/point";
import config from "@/config";
import { socket } from "@/socket";
import {
  CanvasInfo,
  CanvasInfoRequest,
  Point,
} from "@blurple-canvas-web/types";
import { useSelectedColorContext } from "./SelectedColorContext";

interface CanvasContextType {
  canvas: CanvasInfo;
  coords: Point | null;
  adjustedCoords: Point | null;
  setCanvas: (canvasId: CanvasInfo["id"]) => void;
  setCoords: Dispatch<SetStateAction<Point | null>>;
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
  adjustedCoords: null,
  setCoords: () => {},
  setCanvas: () => {},
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
        setCoords: setSelectedCoords,
        setCanvas: setCanvasById,
      }}
    >
      {children}
    </CanvasContext.Provider>
  );
};

export const useCanvasContext = () => useContext(CanvasContext);
