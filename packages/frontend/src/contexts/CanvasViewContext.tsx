"use client";

import type { PixelColor, Point } from "@blurple-canvas-web/types";
import {
  createContext,
  type Dispatch,
  type RefObject,
  type SetStateAction,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { addPoints, ORIGIN, tupleToPoint } from "@/components/canvas/point";
import { useCanvasContext } from "./CanvasContext";

interface CanvasViewContextType {
  adjustedCoords: Point | null;
  containerRef: RefObject<HTMLDivElement | null>;
  coords: Point | null;
  selectedPixelColor: PixelColor | null;
  isReticleVisible: boolean;
  offset: Point;
  zoom: number;
  setCoords: Dispatch<SetStateAction<Point | null>>;
  setSelectedPixelColor: Dispatch<SetStateAction<PixelColor | null>>;
  setIsReticleVisible: Dispatch<SetStateAction<boolean>>;
  setOffset: Dispatch<SetStateAction<Point>>;
  setZoom: Dispatch<SetStateAction<number>>;
}

const CanvasViewContext = createContext<CanvasViewContextType>({
  adjustedCoords: null,
  containerRef: { current: null },
  coords: null,
  selectedPixelColor: null,
  isReticleVisible: false,
  offset: ORIGIN,
  zoom: 1,
  setCoords: () => {},
  setSelectedPixelColor: () => {},
  setIsReticleVisible: () => {},
  setOffset: () => {},
  setZoom: () => {},
});

interface CanvasViewProviderProps {
  children: React.ReactNode;
}

export const CanvasViewProvider = ({ children }: CanvasViewProviderProps) => {
  const { canvas } = useCanvasContext();
  const [selectedCoords, setSelectedCoords] =
    useState<CanvasViewContextType["coords"]>(null);
  const [selectedPixelColor, setSelectedPixelColor] =
    useState<CanvasViewContextType["selectedPixelColor"]>(null);
  const [isReticleVisible, setIsReticleVisible] =
    useState<CanvasViewContextType["isReticleVisible"]>(true);
  const [zoom, setZoom] = useState(1);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [offset, setOffset] = useState(ORIGIN);
  const [prevCanvasId, setPrevCanvasId] = useState(canvas.id);

  if (prevCanvasId !== canvas.id) {
    setSelectedCoords(null);
    setPrevCanvasId(canvas.id);
  }

  const adjustedCoords = useMemo(() => {
    if (selectedCoords) {
      return addPoints(selectedCoords, tupleToPoint(canvas.startCoordinates));
    }

    return null;
  }, [canvas.startCoordinates, selectedCoords]);

  return (
    <CanvasViewContext.Provider
      value={{
        adjustedCoords,
        containerRef: containerRef,
        coords: selectedCoords,
        selectedPixelColor: selectedPixelColor,
        isReticleVisible: isReticleVisible && selectedCoords !== null,
        offset: offset,
        zoom: zoom,
        setCoords: setSelectedCoords,
        setSelectedPixelColor: setSelectedPixelColor,
        setIsReticleVisible: setIsReticleVisible,
        setOffset: setOffset,
        setZoom: setZoom,
      }}
    >
      {children}
    </CanvasViewContext.Provider>
  );
};

export const useCanvasViewContext = () => useContext(CanvasViewContext);
