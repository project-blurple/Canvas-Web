"use client";

import { createContext, useContext } from "react";

interface ImageOverlayState {
  alt: string;
  file: File | null;
  left: number;
  top: number;
}

interface ImageOverlayContextType {
  imageOverlay: ImageOverlayState | null;
}

const ImageOverlayContext = createContext<ImageOverlayContextType>({
  imageOverlay: null,
});

interface ImageOverlayProviderProps {
  children: React.ReactNode;
  imageOverlay: ImageOverlayState | null;
}

export const ImageOverlayProvider = ({
  children,
  imageOverlay,
}: ImageOverlayProviderProps) => {
  return (
    <ImageOverlayContext.Provider value={{ imageOverlay }}>
      {children}
    </ImageOverlayContext.Provider>
  );
};

export const useImageOverlayContext = () => useContext(ImageOverlayContext);
