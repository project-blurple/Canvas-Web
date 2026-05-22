"use client";

import { styled } from "@mui/material";
import { useEffect, useState } from "react";
import { RenderOverlayShades } from "./SelectedBoundsOverlay";

const OverlayWrapper = styled("div")`
  position: absolute;
  z-index: 2;
`;

const OverlayImage = styled("img")`
  display: block;
  image-rendering: pixelated;
  max-width: none;
  transform-origin: top left;
`;

interface ImageOverlayProps {
  alt?: string;
  canvasHeight: number;
  canvasWidth: number;
  file: File | null;
  left: number;
  top: number;
  width: number;
  height: number;
}

export default function ImageOverlay({
  alt = "Overlay image",
  canvasHeight,
  canvasWidth,
  file,
  left,
  top,
  width,
  height,
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
      <OverlayWrapper
        style={{
          transform: `translate(${left}px, ${top}px)`,
        }}
      >
        <OverlayImage
          alt={alt}
          src={imageUrl}
          width={width}
          height={height}
          style={{
            height,
            width,
          }}
        />
      </OverlayWrapper>
    </>
  );
}
