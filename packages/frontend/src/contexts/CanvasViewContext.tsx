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
import { ViewBounds } from "@/util";
import { useCanvasContext } from "./CanvasContext";

interface CanvasViewContextType {
  adjustedCoords: Point | null;
  containerRef: RefObject<HTMLDivElement | null>;
  coords: Point | null;
  isReticleVisible: boolean;
  offset: Point;
  selectedBounds: ViewBounds | null;
  zoom: number;
  setCoords: Dispatch<SetStateAction<Point | null>>;
  setIsReticleVisible: Dispatch<SetStateAction<boolean>>;
  setOffset: Dispatch<SetStateAction<Point>>;
  setSelectedBounds: Dispatch<SetStateAction<ViewBounds | null>>;
  setZoom: Dispatch<SetStateAction<number>>;
}

export const CanvasViewContext = createContext<CanvasViewContextType>({
  adjustedCoords: null,
  containerRef: { current: null },
  coords: null,
  isReticleVisible: false,
  offset: ORIGIN,
  selectedBounds: null,
  zoom: 1,
  setCoords: () => {},
  setIsReticleVisible: () => {},
  setOffset: () => {},
  setSelectedBounds: () => {},
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
  const [selectedBounds, setSelectedBounds] =
    useState<CanvasViewContextType["selectedBounds"]>(null);

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
        selectedBounds,
        zoom: zoom,
        setCoords: setSelectedCoords,
        setIsReticleVisible: setIsReticleVisible,
        setOffset: setOffset,
        setSelectedBounds: setSelectedBounds,
        setZoom: setZoom,
      }}
    >
      {children}
    </CanvasViewContext.Provider>
  );
};

export const useCanvasViewContext = () => useContext(CanvasViewContext);
