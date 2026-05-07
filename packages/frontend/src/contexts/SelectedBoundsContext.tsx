"use client";

import type { CanvasInfo, Point } from "@blurple-canvas-web/types";
import {
  createContext,
  type Dispatch,
  type RefObject,
  type SetStateAction,
  useCallback,
  useContext,
  useState,
} from "react";
import { SELECTED_BOUNDS_DEFAULT_MIN_SIZE } from "@/constants/selectedBounds";
import type { ViewBounds } from "@/util";
import { useCanvasContext } from "./CanvasContext";
import { useCanvasViewContext } from "./CanvasViewContext";

interface SelectedBoundsContextType {
  canEdit: boolean;
  minHeight: number;
  minWidth: number;
  selectedBounds: ViewBounds | null;
  showSelectedBounds: boolean;
  resetSelectedBounds: () => void;
  setCanEdit: Dispatch<SetStateAction<boolean>>;
  setMinimumBounds: (width: number, height: number) => void;
  setSelectedBounds: Dispatch<SetStateAction<ViewBounds | null>>;
  setBoundsToCurrentView: (fillRatio: number) => void;
  setShowSelectedBounds: Dispatch<SetStateAction<boolean>>;
}

const SelectedBoundsContext = createContext<SelectedBoundsContextType>({
  canEdit: false,
  minHeight: SELECTED_BOUNDS_DEFAULT_MIN_SIZE.height,
  minWidth: SELECTED_BOUNDS_DEFAULT_MIN_SIZE.width,
  selectedBounds: null,
  showSelectedBounds: false,
  resetSelectedBounds: () => {},
  setCanEdit: () => {},
  setMinimumBounds: () => {},
  setSelectedBounds: () => {},
  setBoundsToCurrentView: () => {},
  setShowSelectedBounds: () => {},
});

interface CurrentViewParams {
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
}: CurrentViewParams): ViewBounds {
  if (!containerRef.current) {
    return {
      left: 0,
      top: 0,
      right: canvas.width,
      bottom: canvas.height,
      width: canvas.width,
      height: canvas.height,
    };
  }

  const containerWidth = containerRef.current.clientWidth ?? 0;
  const containerHeight = containerRef.current.clientHeight ?? 0;

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
  canvas: CanvasInfo,
): ViewBounds {
  const centerX = (viewBounds.left + viewBounds.right) / 2;
  const centerY = (viewBounds.top + viewBounds.bottom) / 2;

  const left = centerX - (centerX - viewBounds.left) * frameFillRatio;
  const right = centerX + (viewBounds.right - centerX) * frameFillRatio;
  const top = centerY - (centerY - viewBounds.top) * frameFillRatio;
  const bottom = centerY + (viewBounds.bottom - centerY) * frameFillRatio;

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
  const [minHeight, setMinHeight] = useState<
    SelectedBoundsContextType["minHeight"]
  >(SELECTED_BOUNDS_DEFAULT_MIN_SIZE.height);
  const [minWidth, setMinWidth] = useState<
    SelectedBoundsContextType["minWidth"]
  >(SELECTED_BOUNDS_DEFAULT_MIN_SIZE.width);
  const [showSelectedBounds, setShowSelectedBounds] =
    useState<SelectedBoundsContextType["showSelectedBounds"]>(false);

  const setMinimumBounds = useCallback((width: number, height: number) => {
    setMinWidth(width);
    setMinHeight(height);
  }, []);

  const { canvas } = useCanvasContext();
  const { containerRef, offset, zoom } = useCanvasViewContext();

  const resetSelectedBounds = useCallback(() => {
    setSelectedBounds(null);
    setMinimumBounds(
      SELECTED_BOUNDS_DEFAULT_MIN_SIZE.width,
      SELECTED_BOUNDS_DEFAULT_MIN_SIZE.height,
    );
    setCanEdit(false);
    setShowSelectedBounds(false);
  }, [setMinimumBounds]);

  const setBoundsToCurrentView = useCallback(
    (fillRatio: number) => {
      const currentViewBounds = getCurrentViewBounds({
        canvas,
        containerRef,
        offset,
        zoom,
      });
      const fittedBounds = fitViewBoundsToFillRatio(
        currentViewBounds,
        fillRatio,
        canvas,
      );
      setSelectedBounds(fittedBounds);
    },
    [canvas, containerRef, offset, zoom],
  );

  return (
    <SelectedBoundsContext.Provider
      value={{
        canEdit,
        minHeight,
        minWidth,
        selectedBounds,
        showSelectedBounds,
        resetSelectedBounds,
        setSelectedBounds,
        setBoundsToCurrentView,
        setCanEdit,
        setMinimumBounds,
        setShowSelectedBounds,
      }}
    >
      {children}
    </SelectedBoundsContext.Provider>
  );
};

export const useSelectedBoundsContext = () => useContext(SelectedBoundsContext);
