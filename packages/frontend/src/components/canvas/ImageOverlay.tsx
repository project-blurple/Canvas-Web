"use client";

import { styled } from "@mui/material";
import { useEffect, useState } from "react";

const OverlayImage = styled("img")`
  image-rendering: pixelated;
  position: absolute;
`;

interface ImageOverlayProps {
  file: File | null;
  left: number;
  top: number;
  alt?: string;
}

export default function ImageOverlay({
  file,
  left,
  top,
  alt = "Overlay image",
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

  return <OverlayImage alt={alt} src={imageUrl} style={{ left, top }} />;
}
