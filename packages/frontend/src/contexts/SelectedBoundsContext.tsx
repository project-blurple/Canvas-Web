"use client";

import { CanvasInfo, Point } from "@blurple-canvas-web/types";
import {
  createContext,
  Dispatch,
  RefObject,
  SetStateAction,
  useContext,
  useState,
} from "react";
import { ViewBounds } from "@/util";
import { useCanvasContext } from "./CanvasContext";
import { useCanvasViewContext } from "./CanvasViewContext";

interface SelectedBoundsContextType {
  canEdit: boolean;
  selectedBounds: ViewBounds | null;
  setCanEdit: Dispatch<SetStateAction<boolean>>;
  setSelectedBounds: Dispatch<SetStateAction<ViewBounds | null>>;
  setBoundsToCurrentView: (fillRatio: number) => void;
}

export const SelectedBoundsContext = createContext<SelectedBoundsContextType>({
  canEdit: false,
  selectedBounds: null,
  setCanEdit: () => {},
  setSelectedBounds: () => {},
  setBoundsToCurrentView: () => {},
});

interface CurrentViewProps {
  canvas: CanvasInfo;
  containerRef: RefObject<HTMLDivElement | null>;
  offset: Point;
  zoom: number;
}

function getCurrentViewBounds({
  canvas,
  containerRef,
  offset,
  zoom,
}: CurrentViewProps): ViewBounds {
  console.log(containerRef);

  const containerWidth = containerRef.current?.clientWidth ?? 0;
  const containerHeight = containerRef.current?.clientHeight ?? 0;

  const left = canvas.width / 2 + (-containerWidth / 2 - offset.x) / zoom;
  const right = canvas.width / 2 + (containerWidth / 2 - offset.x) / zoom;
  const top = canvas.height / 2 + (-containerHeight / 2 - offset.y) / zoom;
  const bottom = canvas.height / 2 + (containerHeight / 2 - offset.y) / zoom;

  const clampedLeft = Math.max(0, Math.floor(left));
  const clampedTop = Math.max(0, Math.floor(top));
  const clampedRight = Math.min(canvas.width, Math.ceil(right));
  const clampedBottom = Math.min(canvas.height, Math.ceil(bottom));

  return {
    left: clampedLeft,
    top: clampedTop,
    right: clampedRight,
    bottom: clampedBottom,
    width: clampedRight - clampedLeft,
    height: clampedBottom - clampedTop,
  };
}

function fitViewBoundsToFillRatio(
  viewBounds: ViewBounds,
  frameFillRatio: number,
): ViewBounds {
  const centerX = (viewBounds.left + viewBounds.right) / 2;
  const centerY = (viewBounds.top + viewBounds.bottom) / 2;

  const left = centerX - (centerX - viewBounds.left) * frameFillRatio;
  const right = centerX + (viewBounds.right - centerX) * frameFillRatio;
  const top = centerY - (centerY - viewBounds.top) * frameFillRatio;
  const bottom = centerY + (viewBounds.bottom - centerY) * frameFillRatio;

  const clampedLeft = Math.max(0, Math.floor(left));
  const clampedTop = Math.max(0, Math.floor(top));
  const clampedRight = Math.min(viewBounds.right * 2, Math.ceil(right));
  const clampedBottom = Math.min(viewBounds.bottom * 2, Math.ceil(bottom));

  return {
    left: clampedLeft,
    top: clampedTop,
    right: clampedRight,
    bottom: clampedBottom,
    width: clampedRight - clampedLeft,
    height: clampedBottom - clampedTop,
  };
}

interface SelectedBoundsProviderProps {
  children: React.ReactNode;
}

export const SelectedBoundsProvider = ({
  children,
}: SelectedBoundsProviderProps) => {
  const [selectedBounds, setSelectedBounds] =
    useState<SelectedBoundsContextType["selectedBounds"]>(null);
  const [canEdit, setCanEdit] =
    useState<SelectedBoundsContextType["canEdit"]>(false);

  const { canvas } = useCanvasContext();
  const { containerRef, offset, zoom } = useCanvasViewContext();

  function setBoundsToCurrentView(fillRatio: number) {
    setSelectedBounds(
      fitViewBoundsToFillRatio(
        getCurrentViewBounds({
          canvas,
          containerRef,
          offset,
          zoom,
        }),
        fillRatio,
      ),
    );
  }

  return (
    <SelectedBoundsContext.Provider
      value={{
        selectedBounds,
        setSelectedBounds,
        setBoundsToCurrentView,
        canEdit,
        setCanEdit,
      }}
    >
      {children}
    </SelectedBoundsContext.Provider>
  );
};

export const useSelectedBoundsContext = () => useContext(SelectedBoundsContext);
