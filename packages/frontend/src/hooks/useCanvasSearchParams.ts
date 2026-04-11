"use client";

import { useParams, useSearchParams } from "next/navigation";
import { extractSearchParam } from "@/util/searchParams";

export interface CanvasSearchParams {
  canvasId: number | null;
  x: number | null;
  y: number | null;
  zoom: number | null;
  pixelWidth: number | null;
  pixelHeight: number | null;
  frameId: string | null;
}

function parseIntParam(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseFloatParam(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function parsePathParam(value: string | string[] | undefined): number | null {
  if (typeof value !== "string" || value.length === 0) return null;

  return parseIntParam(value);
}

export function useCanvasSearchParams(): CanvasSearchParams {
  const params = useParams<{ canvasId?: string | string[] }>();
  const searchParams = useSearchParams();

  return {
    canvasId:
      parsePathParam(params.canvasId) ??
      parseIntParam(extractSearchParam(searchParams, "canvasId")),
    x: parseIntParam(extractSearchParam(searchParams, "x")),
    y: parseIntParam(extractSearchParam(searchParams, "y")),
    zoom: parseFloatParam(extractSearchParam(searchParams, "z")),
    pixelWidth: parseIntParam(extractSearchParam(searchParams, "pixelWidth")),
    pixelHeight: parseIntParam(extractSearchParam(searchParams, "pixelHeight")),
    frameId: extractSearchParam(searchParams, "frameId"),
  };
}
