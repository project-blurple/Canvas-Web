"use client";

import type { Frame, PixelColor, Point } from "@blurple-canvas-web/types";
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
  focusOnFrame: (frame: Frame) => void;
  focusOnFrameRef: RefObject<((frame: Frame) => void) | null>;
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
  focusOnFrame: () => {},
  focusOnFrameRef: { current: null },
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
  const focusOnFrameRef = useRef<((frame: Frame) => void) | null>(null);

  const focusOnFrame = (frame: Frame) => {
    focusOnFrameRef.current?.(frame);
  };

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
        containerRef,
        coords: selectedCoords,
        isReticleVisible: isReticleVisible && selectedCoords !== null,
        offset,
        selectedPixelColor,
        setCoords: setSelectedCoords,
        setIsReticleVisible,
        setOffset,
        setSelectedPixelColor,
        setZoom,
        zoom,
        focusOnFrame,
        focusOnFrameRef,
      }}
    >
      {children}
    </CanvasViewContext.Provider>
  );
};

export const useCanvasViewContext = () => useContext(CanvasViewContext);
