"use client";

import type { Point } from "@blurple-canvas-web/types";
import { createContext, useContext, useState } from "react";

interface ImageOverlayState {
  alt: string;
  file: File | null;
}

interface ImageOverlayContextType {
  imageOverlay: ImageOverlayState | null;
  showOverlay: boolean;
  topLeftCoordinates: Point;
  setImageOverlay: (overlay: ImageOverlayState | null) => void;
  setShowOverlay: (show: boolean) => void;
  setTopLeftCoordinates: (point: Point) => void;
}

const ImageOverlayContext = createContext<ImageOverlayContextType>({
  imageOverlay: null,
  showOverlay: false,
  topLeftCoordinates: { x: 0, y: 0 },
  setImageOverlay: () => {},
  setShowOverlay: () => {},
  setTopLeftCoordinates: () => {},
});

interface ImageOverlayProviderProps {
  children: React.ReactNode;
}

export const ImageOverlayProvider = ({
  children,
}: ImageOverlayProviderProps) => {
  const [imageOverlay, setImageOverlay] = useState<ImageOverlayState | null>(
    null,
  );
  const [showOverlay, setShowOverlay] = useState(false);
  const [topLeftCoordinates, setTopLeftCoordinates] = useState<Point>({
    x: 0,
    y: 0,
  });
  return (
    <ImageOverlayContext.Provider
      value={{
        imageOverlay,
        setImageOverlay,
        showOverlay,
        setShowOverlay,
        topLeftCoordinates,
        setTopLeftCoordinates,
      }}
    >
      {children}
    </ImageOverlayContext.Provider>
  );
};

export const useImageOverlayContext = () => useContext(ImageOverlayContext);
