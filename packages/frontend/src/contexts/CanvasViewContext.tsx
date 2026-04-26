"use client";

import { Point } from "@blurple-canvas-web/types";
import {
  createContext,
  Dispatch,
  RefObject,
  SetStateAction,
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
  isReticleVisible: boolean;
  offset: Point;
  zoom: number;
  setCoords: Dispatch<SetStateAction<Point | null>>;
  setIsReticleVisible: Dispatch<SetStateAction<boolean>>;
  setOffset: Dispatch<SetStateAction<Point>>;
  setZoom: Dispatch<SetStateAction<number>>;
}

const CanvasViewContext = createContext<CanvasViewContextType>({
  adjustedCoords: null,
  containerRef: { current: null },
  coords: null,
  isReticleVisible: false,
  offset: ORIGIN,
  zoom: 1,
  setCoords: () => {},
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
        isReticleVisible: isReticleVisible && selectedCoords !== null,
        offset: offset,
        zoom: zoom,
        setCoords: setSelectedCoords,
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
