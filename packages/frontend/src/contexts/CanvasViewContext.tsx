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
  offset: Point;
  zoom: number;
  setCoords: Dispatch<SetStateAction<Point | null>>;
  setSelectedPixelColor: Dispatch<SetStateAction<PixelColor | null>>;
  setOffset: Dispatch<SetStateAction<Point>>;
  setZoom: Dispatch<SetStateAction<number>>;
  focusOnFrame: (frame: Frame) => void;
  setFocusOnFrame: (fn: (frame: Frame) => void) => void;
}

const CanvasViewContext = createContext<CanvasViewContextType>({
  adjustedCoords: null,
  containerRef: { current: null },
  coords: null,
  selectedPixelColor: null,
  offset: ORIGIN,
  zoom: 1,
  setCoords: () => {},
  setSelectedPixelColor: () => {},
  setOffset: () => {},
  setZoom: () => {},
  focusOnFrame: () => {},
  setFocusOnFrame: () => {},
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
  const [zoom, setZoom] = useState(1);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [offset, setOffset] = useState(ORIGIN);
  const [focusOnFrame, setFocusOnFrame] = useState<(frame: Frame) => void>(
    () => () => {},
  );

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
        offset,
        selectedPixelColor,
        setCoords: setSelectedCoords,
        setOffset,
        setSelectedPixelColor,
        setZoom,
        zoom,
        focusOnFrame,
        setFocusOnFrame,
      }}
    >
      {children}
    </CanvasViewContext.Provider>
  );
};

export const useCanvasViewContext = () => useContext(CanvasViewContext);
