"use client";

import { createContext, useContext, useState } from "react";

interface ImageOverlayState {
  alt: string;
  file: File | null;
  left: number;
  top: number;
}

interface ImageOverlayContextType {
  imageOverlay: ImageOverlayState | null;
  showOverlay: boolean;
  setImageOverlay: (overlay: ImageOverlayState | null) => void;
  setShowOverlay: (show: boolean) => void;
}

const ImageOverlayContext = createContext<ImageOverlayContextType>({
  imageOverlay: null,
  showOverlay: false,
  setImageOverlay: () => {},
  setShowOverlay: () => {},
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

  return (
    <ImageOverlayContext.Provider
      value={{ imageOverlay, setImageOverlay, showOverlay, setShowOverlay }}
    >
      {children}
    </ImageOverlayContext.Provider>
  );
};

export const useImageOverlayContext = () => useContext(ImageOverlayContext);
