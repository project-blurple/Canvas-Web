"use client";

import { styled } from "@mui/material";
import { useEffect, useState } from "react";
import { RenderOverlayShades } from "./SelectedBoundsOverlay";

const OverlayImage = styled("img")`
  image-rendering: pixelated;
  position: absolute;
  z-index: 2;
`;

interface ImageOverlayProps {
  alt?: string;
  canvasHeight: number;
  canvasWidth: number;
  file: File | null;
  left: number;
  top: number;
}

export default function ImageOverlay({
  alt = "Overlay image",
  canvasHeight,
  canvasWidth,
  file,
  left,
  top,
}: ImageOverlayProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setImageUrl(null);
      return;
    }

    const nextUrl = URL.createObjectURL(file);
    setImageUrl(nextUrl);

    return () => {
      URL.revokeObjectURL(nextUrl);
    };
  }, [file]);

  if (!imageUrl) return null;

  return (
    <>
      <RenderOverlayShades
        canvasWidth={canvasWidth}
        canvasHeight={canvasHeight}
      />
      <OverlayImage
        alt={alt}
        src={imageUrl}
        style={{ transform: `translate(${left}px, ${top}px)` }}
      />
    </>
  );
}
