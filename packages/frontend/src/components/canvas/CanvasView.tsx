"use client";

import type {
  CanvasInfo,
  Frame,
  PlacePixelSocket,
  Point,
} from "@blurple-canvas-web/types";
import { CircularProgress, css, styled } from "@mui/material";
import { Maximize2, Minimize2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import SelectedBoundsOverlay from "@/components/canvas/SelectedBoundsOverlay";
import config from "@/config";
import {
  useCanvasContext,
  useCanvasViewContext,
  useSelectedBoundsContext,
  useSelectedColorContext,
  useSelectedFrameContext,
} from "@/contexts";
import { useCanvasImage, useCanvasSearchParams } from "@/hooks";
import { useFrameById } from "@/hooks/queries/useFrame";
import type { CanvasSearchParams } from "@/hooks/useCanvasSearchParams";
import { socket } from "@/socket";
import { clamp, normalizeFrameBounds } from "@/util";
import { Button } from "../button";
import {
  addPoints,
  diffPoints,
  distanceBetweenPoints,
  dividePoint,
  getMovementDelta,
  multiplyPoint,
  ORIGIN,
} from "./point";

const CanvasContainer = styled("div")`
  position: relative;
  background-color: var(--discord-legacy-not-quite-black);
  border-radius: var(--card-border-radius);
  border: var(--card-border);
  display: flex;
  grid-row: 1 / -1;
  overflow: hidden;
  place-content: center;
  place-items: center;
  /* Fixes blurry canvas in Safari when canvasImage overlaps with overflow, don't ask why */
  transform: translate3d(0, 0, 0);
  /* Don't handle panning and zooming with browser */
  touch-action: none;

  /* A bit heavy handed, but it prevents elements outside of the canvas from being selected during panning */
  body:has(&:active) {
    --webkit-user-select: none;
    user-select: none;
  }

  ${({ theme }) => theme.breakpoints.down("md")} {
    border-radius: 0;
  }

  &:active {
    cursor: grabbing;
  }

  &:fullscreen,
  &:-webkit-full-screen {
    border-radius: 0;
    border: none;
  }

  & {
    user-select: none;
  }
`;

const ReticleContainer = styled("div")`
  pointer-events: none;
  position: absolute;
  z-index: 1;
`;

const Reticle = styled("img")`
  image-rendering: pixelated;
`;

const PreviewPixel = styled("div")`
  position: absolute;
`;

const InviteButton = styled(Button)`
  background-color: oklch(
    from var(--discord-legacy-dark-but-not-black) l c h / 80%
  );
  box-shadow: 0 0 10px rgba(0 0 0 / 25%);
  color: white;
  font-size: 1.2rem;
  font-weight: 900;
  font-stretch: 125%;
  font-width: 125%;
  inset-inline-end: 0.5rem;
  padding-block: 0.1rem;
  padding-inline: 1rem;
  position: absolute;
  text-decoration: none;
  z-index: 1;

  @media (hover: hover) and (pointer: fine) {
    :hover {
      background-color: var(--discord-blurple);
    }
  }

  ${({ theme }) => theme.breakpoints.up("md")} {
    border-radius: 0.5rem 0.5rem 1rem 0.5rem;
    inset-block-end: 0.5rem;
  }

  ${({ theme }) => theme.breakpoints.down("md")} {
    inset-block-start: 0.5rem;
    border-radius: 0.5rem 0.5rem 0.5rem 1rem;
  }
`;

const FullscreenButton = styled(Button)`
  border-radius: 0.5rem 1rem 0.5rem 0.5rem;
  border-color: transparent;
  color: white;
  inset-block-start: 0.5rem;
  inset-inline-end: 0.5rem;
  min-width: auto;
  padding: 0.5rem;
  position: absolute;
  text-decoration: none;
  z-index: 1;

  @media (hover: hover) and (pointer: fine) {
    :hover {
      border-color: inherit;
      box-shadow: 0 0 10px rgba(0 0 0 / 25%);
    }
  }

  ${({ theme }) => theme.breakpoints.down("md")} {
    display: none;
  }
`;

const CanvasImageWrapper = styled("div", {
  shouldForwardProp: (prop: string) =>
    !["isLaunching", "isLoading"].includes(prop),
})<{
  isLoading: boolean;
  isLaunching: boolean;
}>`
  transition: filter var(--transition-duration-medium) ease;
  ${({ isLoading }) =>
    isLoading &&
    css`
      cursor: wait;
      filter: grayscale(80%);
    `}

  position: relative;

  img {
    ${({ isLaunching }) =>
      isLaunching &&
      css`
        visibility: hidden;
      `}
    image-rendering: pixelated;
    pointer-events: none;
  }

  img:not(:first-child) {
    inset: 0;
    position: absolute;
  }
`;

/**
 * Calculate the default scale to use for the canvas. This tries to maximise the size of the canvas
 * without it overflowing the screen.
 */
function getDefaultZoom(
  container: HTMLDivElement,
  image: HTMLImageElement,
): number {
  // Don't add any padding on the initial scale for small devices
  const padding = container.clientWidth < 500 ? 0 : 50;

  const scale = Math.min(
    (container.clientWidth - padding) / image.width,
    (container.clientHeight - padding) / image.height,
  );

  return scale;
}

/**
 * Calculate the position of the mouse relative to the given element
 **/
function getRelativePointerPosition(element: HTMLElement, event: MouseEvent) {
  const rect = element.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

/**
 * Calculates the various variables required to get pan pinch working
 */
function calculateTouchOffsetDelta(
  event1: PointerEvent | undefined,
  event2: PointerEvent | undefined,
  elem: HTMLElement,
) {
  if (event1 === undefined || event2 === undefined)
    return { offset: undefined, scale: undefined, centerOffset: undefined };

  const previousEvent1 = previousPointerEvents.get(event1.pointerId);
  const previousEvent2 = previousPointerEvents.get(event2.pointerId);
  if (!previousEvent1 || !previousEvent2)
    return { offset: undefined, scale: undefined, centerOffset: undefined };

  const oldPosition1 = getRelativePointerPosition(elem, event1);
  const oldPosition2 = getRelativePointerPosition(elem, event2);

  const movementDelta1 = getMovementDelta(previousEvent1, event1);
  const movementDelta2 = getMovementDelta(previousEvent2, event2);

  const newPosition1 = addPoints(oldPosition1, {
    x: movementDelta1.x,
    y: movementDelta1.y,
  });
  const newPosition2 = addPoints(oldPosition2, {
    x: movementDelta2.x,
    y: movementDelta2.y,
  });
  const oldMagnitude = distanceBetweenPoints(oldPosition1, oldPosition2);
  const newMagnitude = distanceBetweenPoints(newPosition1, newPosition2);
  const relativePosition = dividePoint(
    addPoints(newPosition1, newPosition2),
    2,
  );
  const offsetDelta = {
    x: movementDelta1.x + movementDelta2.x / 2,
    y: movementDelta1.y + movementDelta2.y / 2,
  };
  const scale = newMagnitude / oldMagnitude;
  return { offsetDelta, scale, centerOffset: relativePosition };
}

function clampZoom(zoom: number, initialZoom: number) {
  return clamp(zoom, MIN_ZOOM_FACTOR * initialZoom, MAX_ZOOM);
}

interface CanvasTargetView {
  targetZoom: number;
  offset: Point;
  targetPoint: Point;
}

function getInitialViewFromSearchParams({
  params,
  frame,
  canvas,
  container,
  initialZoom,
}: {
  params: CanvasSearchParams;
  frame: Frame | null;
  canvas: CanvasInfo;
  container: HTMLDivElement;
  initialZoom: number;
}): CanvasTargetView | null {
  if (params.frameId) {
    if (
      !frame ||
      frame.canvasId !== canvas.id ||
      frame.id.toUpperCase() !== params.frameId.toUpperCase()
    )
      return null;

    return getViewForFrame({
      frame,
      canvas,
      container,
      initialZoom,
    });
  } else {
    const canvasX = params.x;
    const canvasY = params.y;

    if (canvasX === null || canvasY === null) return null;

    const zoomFromQuery = params.zoom;
    const hasPixelDimensions =
      params.pixelWidth !== null || params.pixelHeight !== null;

    let targetZoom = initialZoom;

    if (zoomFromQuery !== null) {
      targetZoom = clampZoom(zoomFromQuery, initialZoom);
    } else if (hasPixelDimensions) {
      const widthBasedZoom =
        params.pixelWidth !== null ?
          container.clientWidth / params.pixelWidth
        : Number.POSITIVE_INFINITY;

      const heightBasedZoom =
        params.pixelHeight !== null ?
          container.clientHeight / params.pixelHeight
        : Number.POSITIVE_INFINITY;

      const fitZoom = Math.min(widthBasedZoom, heightBasedZoom);
      targetZoom = clampZoom(fitZoom, initialZoom);
    }

    const [startX, startY] = canvas.startCoordinates;

    const targetPoint = {
      x: clamp(canvasX - startX, 0, canvas.width - 1),
      y: clamp(canvasY - startY, 0, canvas.height - 1),
    };

    const offset = {
      x: (canvas.width / 2 - (targetPoint.x + 0.5)) * targetZoom,
      y: (canvas.height / 2 - (targetPoint.y + 0.5)) * targetZoom,
    };

    return { targetZoom, offset, targetPoint };
  }
}

// Arbitrary value applied to the deltaY of the wheel zoom function to make it feel right
const SCALE_FACTOR = 0.002;
// MAX ZOOM is the absolute maximum scaling that can be applied to the image element
const MAX_ZOOM = 100;
// MIN ZOOM_FACTOR is relative to the initalZoom. i.e. MIN_ZOOM_FACTOR = 0.9 -> minimumCssScale = 0.9 * initialZoom
const MIN_ZOOM_FACTOR = 0.9;
const FRAME_FIT_FILL_RATIO = 0.75;

const PAN_DECAY = 0.75;

// This is to avoid weird business with the reticle not sizing properly
const RETICLE_ORIGINAL_SCALE = 10;
const RETICLE_ORIGINAL_SIZE = 14;
const RETICLE_SIZE = RETICLE_ORIGINAL_SIZE * 10;
const RETICLE_SCALE = 1 / (RETICLE_ORIGINAL_SCALE * 10);
const PREVIEW_PIXEL_SIZE = 0.8 * RETICLE_ORIGINAL_SCALE * 10;

const pointerEvents: Map<number, PointerEvent> = new Map();
const previousPointerEvents: Map<number, PointerEvent> = new Map();
// Used to handle pointer events when there are multiple pointers down
let pointerSyncCounter = 0;

function calculateReticleOffset(coords: Point | null): Point {
  if (!coords) return { x: 0, y: 0 };
  return {
    x: (coords.x - (RETICLE_SIZE - 1) / 2) / RETICLE_SCALE,
    y: (coords.y - (RETICLE_SIZE - 1) / 2) / RETICLE_SCALE,
  };
}

function getViewForFrame({
  frame,
  canvas,
  container,
  initialZoom,
}: {
  frame: Frame;
  canvas: CanvasInfo;
  container: HTMLDivElement;
  initialZoom: number;
}): CanvasTargetView {
  const frameBounds = normalizeFrameBounds(frame);
  const targetZoom = clampZoom(
    Math.min(
      (container.clientWidth * FRAME_FIT_FILL_RATIO) / frameBounds.width,
      (container.clientHeight * FRAME_FIT_FILL_RATIO) / frameBounds.height,
    ),
    initialZoom,
  );

  const targetPoint = {
    x: clamp((frameBounds.left + frameBounds.right) / 2, 0, canvas.width - 1),
    y: clamp((frameBounds.top + frameBounds.bottom) / 2, 0, canvas.height - 1),
  };

  const offset = {
    x: (canvas.width / 2 - (targetPoint.x + 0.5)) * targetZoom,
    y: (canvas.height / 2 - (targetPoint.y + 0.5)) * targetZoom,
  };

  return { targetZoom, offset, targetPoint };
}

export default function CanvasView() {
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasImageWrapperRef = useRef<HTMLImageElement>(null);
  const canvasPanAndZoomRef = useRef<HTMLDivElement>(null);

  const { color } = useSelectedColorContext();
  const { frame, setFrame } = useSelectedFrameContext();
  const { canEdit, minHeight, minWidth, selectedBounds, setSelectedBounds } =
    useSelectedBoundsContext();
  const { canvas, setCanvas } = useCanvasContext();
  const {
    containerRef,
    coords,
    isReticleVisible,
    offset,
    setCoords,
    setOffset,
    setZoom,
    zoom,
  } = useCanvasViewContext();
  const sourceImage = useCanvasImage(canvas.id);

  const [isLoading, setIsLoading] = useState(true);
  const [isLaunching, setIsLaunching] = useState(true);
  const zoomRef = useRef(0);
  // Always have access to the most up to date zoom value
  zoomRef.current = zoom;

  const [initialZoom, setInitialZoom] = useState(1);
  const [velocity, setVelocity] = useState<Point>({ x: 0, y: 0 });
  const [controlledPan, setControlledPan] = useState(false);
  // Only applies to when zooming is triggered by wheel event
  const [isZooming, setIsZooming] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [canUseFullscreen, setCanUseFullscreen] = useState(false);
  // const canvasCtxRef = useRef<OffscreenCanvasRenderingContext2D | null>(null);
  const offscreenCanvasRef = useRef<OffscreenCanvas | null>(null);
  const currentCanvasIDRef = useRef(0);
  // Counts the number of pixels that have been overlaid over the canvas from live updates
  const overlayCountRef = useRef(0);
  // Maximum amount of pixels that can be overlaid. From testing on an M1 Pro, seems to be around 100
  const pixelOverlayThreshold = 50;

  /**
   * Transition animation on canvas pan and zoom is blurred on Safari and needs to be disabled.
   * If the user spoof their user agent, this is not my problem.
   * @see https://bugs.webkit.org/show_bug.cgi?id=27684
   */
  const isWebKit = useMemo(() => {
    const { userAgent: ua, vendor } = navigator;
    const isProbablyWebKit =
      vendor === "Apple Computer, Inc." ||
      ua.includes("AppleWebKit/") ||
      ua.includes("Safari/");
    const isNotChromium = !ua.includes("Chrome/") && !ua.includes("Chromium/");
    return isProbablyWebKit && isNotChromium;
  }, []);

  const canvasSearchParams = useCanvasSearchParams();
  const initialCanvasSearchParamsRef = useRef(canvasSearchParams);
  const {
    data: initialFrameFromSearchParams,
    isLoading: isInitialFrameFromSearchParamsLoading,
  } = useFrameById({
    frameId: initialCanvasSearchParamsRef.current.frameId ?? undefined,
  });
  const hasAppliedInitialCanvasRef = useRef(false);
  const hasAppliedInitialViewRef = useRef(false);
  const hasAppliedInitialFrameRef = useRef(false);

  useEffect(() => {
    setCanUseFullscreen(
      document.fullscreenEnabled &&
        window.matchMedia("(pointer: fine)").matches,
    );
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    handleFullscreenChange();

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [containerRef.current]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: legacy
  const handleLoadImage = useCallback(
    (image: HTMLImageElement): void => {
      if (currentCanvasIDRef.current === canvas.id) return;
      currentCanvasIDRef.current = canvas.id;
      const zoom =
        containerRef.current ? getDefaultZoom(containerRef.current, image) : 1;

      const offscreenCanvas = new OffscreenCanvas(image.width, image.height);
      const ctx = offscreenCanvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(image, 0, 0, image.width, image.height);
      offscreenCanvasRef.current = offscreenCanvas;
      setInitialZoom(zoom);

      let appliedInitialView = false;
      const params = initialCanvasSearchParamsRef.current;
      const shouldApplyInitialViewForCurrentCanvas =
        params.canvasId === null || params.canvasId === canvas.id;

      if (
        !hasAppliedInitialViewRef.current &&
        shouldApplyInitialViewForCurrentCanvas
      ) {
        const container = containerRef.current;

        if (container) {
          const initialView = getInitialViewFromSearchParams({
            params,
            frame: initialFrameFromSearchParams ?? null,
            canvas,
            container,
            initialZoom: zoom,
          });

          if (initialView) {
            setZoom(initialView.targetZoom);
            setOffset(initialView.offset);
            setCoords({
              x: initialView.targetPoint.x,
              y: initialView.targetPoint.y,
            });
            appliedInitialView = true;
          }
        }

        // Ensure this only runs once on page load, even if params are missing/invalid.
        if (!params.frameId) {
          hasAppliedInitialViewRef.current = true;
        }
      }

      if (!appliedInitialView) {
        setZoom(zoom);
        setOffset(ORIGIN);
      }

      setVelocity(ORIGIN);
      setIsLoading(false);
      setIsLaunching(false);
      clearOverlay();
    },
    [canvas.id, initialFrameFromSearchParams],
  );

  useEffect(
    function switchToCanvasFromSearchParams() {
      if (hasAppliedInitialCanvasRef.current) return;

      const targetCanvasId = initialCanvasSearchParamsRef.current.canvasId;
      if (targetCanvasId === null || targetCanvasId === canvas.id) {
        hasAppliedInitialCanvasRef.current = true;
        return;
      }

      hasAppliedInitialCanvasRef.current = true;
      void setCanvas(targetCanvasId).catch(() => {
        // If URL canvas does not exist, keep default canvas.
      });
    },
    [canvas.id, setCanvas],
  );

  useEffect(() => {
    // Stops placing pixels from reloading the canvas
    if (currentCanvasIDRef.current === canvas.id) return;
    setIsLoading(true);
    if (sourceImage) {
      handleLoadImage(sourceImage);
    }
  }, [canvas.id, sourceImage, handleLoadImage]);

  useEffect(
    function applyInitialFrameFromSearchParams() {
      if (hasAppliedInitialFrameRef.current) return;

      const params = initialCanvasSearchParamsRef.current;
      if (!params.frameId) return;

      const shouldApplyForCurrentCanvas =
        params.canvasId === null || params.canvasId === canvas.id;
      if (!shouldApplyForCurrentCanvas) return;

      // Wait for frame lookup before deciding whether initial frame view can be applied.
      if (isInitialFrameFromSearchParamsLoading) return;

      if (initialFrameFromSearchParams?.canvasId === canvas.id) {
        setFrame(initialFrameFromSearchParams);
      }

      // Frame lookup resolved for the initial frame URL, so do not try again.
      hasAppliedInitialFrameRef.current = true;
    },
    [
      canvas.id,
      initialFrameFromSearchParams,
      isInitialFrameFromSearchParamsLoading,
      setFrame,
    ],
  );

  /********************************
   * SOCKET FUNCTIONALITY.       *
   ********************************/

  // biome-ignore lint/correctness/useExhaustiveDependencies: legacy
  useEffect(() => {
    const onDisconnect = () => {
      console.debug("[Live Updating]: Disconnected from server");
    };

    // If the canvas is locked, we don't need to listen for updates.
    if (canvas.isLocked) {
      return;
    }

    if (!socket.connected) {
      socket.connect();
    }

    const onConnect = () => {
      console.debug("[Live Updating]: Connected to server");
      console.debug(
        `[Live Updating]: Listening to pixel updates for canvas ${canvas.id}`,
      );
    };

    const onPixelPlaced = (
      payload: PlacePixelSocket.Payload,
      pixelTimestamp: string,
    ) => {
      console.debug("[Live Updating]: Received pixel update", payload);

      // If we disconnect and reconnect this tells the server we've received pixels up to this point
      socket.auth = {
        ...socket.auth,
        pixelTimestamp,
      };

      // Updates the canvas `canvas` which is used as the source of truth for the canvas
      const ctx = offscreenCanvasRef.current?.getContext("2d");
      if (!ctx) return;
      const [r, g, b, a] = payload.rgba;
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a / 255})`;
      ctx.fillRect(payload.x, payload.y, 1, 1);

      // This method prevents the need to convert an N×M canvas to a png on every update
      // while also preventing an inordinate amount of overlaid pixels from causing lag
      if (overlayCountRef.current >= pixelOverlayThreshold) {
        // flush the overlayed pixels and update canvas image
        clearOverlay();
        offscreenCanvasRef.current?.convertToBlob().then((blob) => {
          if (!imageRef.current) return;
          const oldSrc = imageRef.current.src;
          imageRef.current.src = URL.createObjectURL(blob);
          URL.revokeObjectURL(oldSrc);
        });
        overlayCountRef.current = 0;
      } else {
        // overlay the pixel without any changes
        overlayCountRef.current++;
        overlayPixel(payload);
      }
    };

    /**
     * Creates a single pixel png using `OffscreenCanvas` based on the payload,
     * and overlays it over the canvas as a child node.
     */
    const overlayPixel = (payload: PlacePixelSocket.Payload) => {
      const offscreenCanvas = new OffscreenCanvas(canvas.width, canvas.height);
      const ctx = offscreenCanvas.getContext("2d");
      if (!ctx) return;
      const [r, g, b, a] = payload.rgba;
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a / 255})`;
      ctx.fillRect(payload.x, payload.y, 1, 1);
      offscreenCanvas.convertToBlob().then((blob) => {
        const pixelImage = new Image();
        pixelImage.src = URL.createObjectURL(blob);
        pixelImage.onload = () => {
          canvasImageWrapperRef.current?.appendChild(pixelImage);
        };
      });
    };

    const pixelPlaceEvent = `place pixel ${canvas.id}`;

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on(pixelPlaceEvent, onPixelPlaced);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off(pixelPlaceEvent, onPixelPlaced);
      socket.disconnect();
    };
  }, [canvas]);

  /**
   * Clears all overlayed pixels from the canvas image wrapper
   */
  const clearOverlay = () => {
    // canvasImageWrapper.children only gets populated per DOM update.
    // This means that if the pixels are overlaid in a for loop, `clearOverlay` doesn't run during the loop.
    // Keep this in mind when testing for performance.
    const canvasImageWrapper = canvasImageWrapperRef.current;
    if (!canvasImageWrapper) return;
    // Clears all overlayed pixels and retains the original image
    while (canvasImageWrapper.children.length > 1) {
      const lastChild = canvasImageWrapper.lastChild;
      if (lastChild && lastChild instanceof HTMLImageElement) {
        URL.revokeObjectURL(lastChild.src);
        canvasImageWrapper.removeChild(lastChild);
      }
    }
  };

  /********************************
   * ZOOMING FUNCTIONALITY.       *
   ********************************/

  /**
   * Performs zoom for both WheelEvent and PointerEvent pinching
   *
   * @param newZoom The new zoom level as a value from `initialZoom * MIN_ZOOM` to `MAX_ZOOM`
   * @param pointerOffset The offset of the `Point` from the visual center of the wrapping container
   */
  // biome-ignore lint/correctness/useExhaustiveDependencies: legacy
  const handleZoom = useCallback(
    (scale: number, pointerPosition: Point, elem: HTMLElement) => {
      // The mouse position's origin is in the top left of the container.
      // Converts this to the offset from the center of the **visual** container
      const pointerOffset = diffPoints(
        { x: elem.offsetWidth / 2, y: elem.offsetHeight / 2 },
        pointerPosition,
      );

      // Zoom here may not have been updated yet if it is pinch zoom
      const newZoom = scale * zoomRef.current;
      const clampedZoom = clamp(
        newZoom,
        MIN_ZOOM_FACTOR * initialZoom,
        MAX_ZOOM,
      );

      // Clamping the zoom means the actual scale may be different.
      const clampedScale = clampedZoom / zoomRef.current;

      setOffset((prevOffset) => {
        // Calculate the of the mouse position relative to the center of where the canvas is positioned.
        const trueOffset = addPoints(prevOffset, pointerOffset);

        // The amount we shift is scaled based on the amount we've zoomed in.
        // Adds an extra shift based on the new scale of the canvas and the true offset
        // Goodbye old comment with old implementation
        const scaledOffsetDiff = multiplyPoint(trueOffset, clampedScale - 1);
        return clampOffset(
          addPoints(scaledOffsetDiff, prevOffset),
          clampedZoom,
        );
      });
      setZoom(clampedZoom);

      setFrame(null);
    },
    [initialZoom],
  );

  useEffect(() => {
    /**
     * When we zoom, not only do we need to scale the image, but to give the appearing of zooming
     * in on a specific pixel, we need to offset the image so that the pixel we're zooming in on
     * stays in the same place on the screen after the zoom.
     */
    const container = containerRef.current;
    const handleWheel = (event: WheelEvent): void => {
      event.preventDefault();
      // Ensures that the handler can be added to a parent element but only operates on the canvas image wrapper.
      // Applying the handler to lower elements for some isn't consistently picked up in certain browsers (Firefox and Chrome).
      // Ideally, the scrolling should work outside of canvas-image-wrapper, but I can't seem to get the behaviour correct.
      const elem = event.currentTarget;
      if (!(elem instanceof HTMLElement)) return;
      if (!(elem instanceof HTMLElement) || event.deltaY === 0) return;
      const pointerPosition = getRelativePointerPosition(elem, event);

      // Use css transition for zoom due to macOS trackpads having high polling rates resulting in laggy zooming if implemented differently
      // Only apply zoom transition on wheel event
      setIsZooming(true);

      // Inclusion of deltaY in calculation to account for different polling rate devices
      // Could try logarithmic scale for smoother increments
      const scaleMagnitude =
        1 + SCALE_FACTOR * Math.max(Math.abs(event.deltaY), 1);
      const scale = event.deltaY > 0 ? 1 / scaleMagnitude : 1 * scaleMagnitude;
      handleZoom(scale, pointerPosition, elem);
    };

    container?.addEventListener("wheel", handleWheel, {
      passive: false,
    });

    return () => container?.removeEventListener("wheel", handleWheel);
  }, [handleZoom, containerRef]);

  /********************************
   * PANNING FUNCTIONALITY.       *
   ********************************/

  /**
   * Ensure that the offset is within bounds. This is defined as at least half the canvas being on
   * screen along an axis.
   */
  const clampOffset = useCallback(
    (offset: Point, zoom: number): Point => {
      const widthLimit = canvas.width / 2;
      const heightLimit = canvas.height / 2;

      return {
        x: clamp(offset.x, -widthLimit * zoom, widthLimit * zoom),
        y: clamp(offset.y, -heightLimit * zoom, heightLimit * zoom),
      };
    },
    [canvas],
  );

  useEffect(() => {
    if (!frame || frame.canvasId !== canvas.id) return;
    const container = containerRef.current;
    if (!container) return;

    const frameView = getViewForFrame({
      frame: frame,
      canvas,
      container,
      initialZoom,
    });

    setIsZooming(false);
    setZoom(frameView.targetZoom);
    setOffset(clampOffset(frameView.offset, frameView.targetZoom));
    setCoords({
      x: Math.floor(frameView.targetPoint.x),
      y: Math.floor(frameView.targetPoint.y),
    });
  }, [
    canvas,
    containerRef,
    initialZoom,
    frame,
    setCoords,
    clampOffset,
    setZoom,
    setOffset,
  ]);

  const updateOffset = useCallback(
    (diff: Point): void => {
      // The more we're zoomed in, the less we've actually moved on the canvas
      const scaledDiff = dividePoint(diff, zoomRef.current);

      setOffset((prevOffset) => {
        const newOffset = addPoints(prevOffset, scaledDiff);
        return clampOffset(newOffset, zoomRef.current);
      });
    },
    [clampOffset, setOffset],
  );

  const handlePan = useCallback(
    (offsetDelta: { x: number; y: number }): void => {
      // Disable transitions while panning
      setIsZooming(false);
      const scaledOffsetDelta = multiplyPoint(offsetDelta, zoomRef.current);
      setVelocity({ x: scaledOffsetDelta.x, y: scaledOffsetDelta.y });
      updateOffset(scaledOffsetDelta);

      setFrame(null);
    },
    [updateOffset, setFrame],
  );

  /**
   * Defaults to pan when a single pointer is down, and zoom when two pointers are down.
   */
  const handlePointerMove = useCallback(
    (event: PointerEvent): void => {
      const elem = event.currentTarget;
      // Only handle primary pointers to prevent duplicate handling
      if (!(elem instanceof HTMLElement)) return;

      const previousEvent = pointerEvents.get(event.pointerId);
      if (!previousEvent) return;
      previousPointerEvents.set(previousEvent.pointerId, previousEvent);
      pointerEvents.set(event.pointerId, event as unknown as PointerEvent);
      if (pointerEvents.size === 2) {
        pointerSyncCounter++;
        // Only checks every second pointerEvent to ensure both pointermove events are fired
        if (pointerSyncCounter === 2) {
          const pointerEventValues = pointerEvents.values();
          const { offsetDelta, scale, centerOffset } =
            calculateTouchOffsetDelta(
              pointerEventValues.next().value,
              pointerEventValues.next().value,
              elem,
            );
          pointerSyncCounter = 0;
          if (!offsetDelta || !scale || !centerOffset) return;
          handlePan(offsetDelta);
          handleZoom(scale, centerOffset, elem);
        }
      } else {
        const movementDelta = getMovementDelta(previousEvent, event);
        handlePan(movementDelta);
      }
    },
    [handlePan, handleZoom],
  );

  /**
   * Remove the listeners when the mouse is released to stop panning.
   */
  const handlePointerUp = useCallback(
    (event: PointerEvent): void => {
      pointerEvents.delete(event.pointerId);
      previousPointerEvents.delete(event.pointerId);
      const elem = event.currentTarget;
      if (!(elem instanceof HTMLElement)) return;
      elem.releasePointerCapture(event.pointerId);

      // Don't disable handlers if there are still pointers down
      if (pointerEvents.size > 0) return;
      setControlledPan(false);

      elem.removeEventListener("pointermove", handlePointerMove);
      elem.removeEventListener("pointerup", handlePointerUp);
      elem.removeEventListener("pointercancel", handlePointerUp);
    },
    [handlePointerMove],
  );

  /**
   * Only add the mouse move listener when you click down so that moving your mouse normally doesn't
   * cause the canvas to pan.
   */
  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const elem = event.currentTarget;
      elem.setPointerCapture(event.pointerId);
      // Don't store more than 2 pointers for pinch handling
      if (pointerEvents.size < 2) {
        // No idea if this is the right way to define the pointerEvents
        pointerEvents.set(event.pointerId, event as unknown as PointerEvent);
      }
      setControlledPan(true);

      elem.addEventListener("pointermove", handlePointerMove);
      elem.addEventListener("pointerup", handlePointerUp);
      elem.addEventListener("pointercancel", handlePointerUp);
    },
    [handlePointerMove, handlePointerUp],
  );

  // Could potentially get replaced by a transition animation with ease, however this will work on Safari
  // biome-ignore lint/correctness/useExhaustiveDependencies: only create the interval when controlledPan changes to prevent recursive calls
  useEffect(() => {
    if (controlledPan) return;
    // could use a circular buffer to store the max velocity over the last few DOM event triggers for a smoother decay
    // extracting the `currentVelocity` like this just seems to make it work over using straight up `velocity`. Thanks ChatSkibidi
    let currentVelocity = { ...velocity };
    const interval = setInterval(() => {
      if (currentVelocity.x < 0.1 && currentVelocity.y < 0.1) {
        setVelocity({ x: 0, y: 0 });
        clearInterval(interval);
        return;
      }
      updateOffset(currentVelocity);
      currentVelocity = {
        x: currentVelocity.x * PAN_DECAY,
        y: currentVelocity.y * PAN_DECAY,
      };
      setVelocity(currentVelocity);
    }, 16);
    return () => clearInterval(interval);
  }, [controlledPan]); // Only restart if `controlledPan` changes

  /***********************************
   * SELECTING PIXEL FUNCTIONALITY.  *
   ***********************************/

  /**
   * When the canvas is clicked, we want to know which pixel was clicked on.
   */
  const handleCanvasClick = useCallback(
    (event: PointerEvent): void => {
      if (!(event.currentTarget instanceof HTMLElement) || !event.isPrimary)
        return;
      const canvas = event.currentTarget;
      // Use boundingClientRect for more accurate pixel positioning
      const relativeMousePos = getRelativePointerPosition(canvas, event);
      const canvasPos = dividePoint(relativeMousePos, zoom);

      const boundedCanvasPos = {
        x: clamp(Math.floor(canvasPos.x), 0, canvas.offsetWidth - 1),
        y: clamp(Math.floor(canvasPos.y), 0, canvas.offsetHeight - 1),
      };
      // we only care about updating the location
      setCoords(boundedCanvasPos);
    },
    [zoom, setCoords],
  );

  useEffect(() => {
    canvasImageWrapperRef.current?.addEventListener(
      "pointerdown",
      handleCanvasClick,
    );

    return () =>
      canvasImageWrapperRef.current?.removeEventListener(
        "pointerdown",
        handleCanvasClick,
      );
  }, [handleCanvasClick]);

  const reticleOffset = calculateReticleOffset(coords);

  const toggleFullscreen = useCallback(async () => {
    const container = containerRef.current;
    if (!container) return;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await container.requestFullscreen();
      }
    } catch (error) {
      console.error("[CanvasView] fullscreen toggle failed", error);
    }
  }, [containerRef.current]);

  return (
    <CanvasContainer ref={containerRef} onPointerDown={handlePointerDown}>
      {canUseFullscreen && (
        <FullscreenButton
          onClick={toggleFullscreen}
          onPointerDown={(event) => event.stopPropagation()}
          type="button"
        >
          {isFullscreen ?
            <Minimize2 />
          : <Maximize2 />}
        </FullscreenButton>
      )}
      {config.discordServerInvite && (
        <a href={config.discordServerInvite} target="_blank" rel="noreferrer">
          <InviteButton
            onPointerDown={(event) => event.stopPropagation()}
            type="button"
          >
            Project Blurple
          </InviteButton>
        </a>
      )}
      <div
        id="canvas-pan-and-zoom"
        ref={canvasPanAndZoomRef}
        style={{
          isolation: "isolate",
          transform: `matrix(${zoom}, 0, 0, ${zoom}, ${offset.x}, ${offset.y})`,
          // Only apply transition when zooming is triggered by wheel event
          transition:
            !isWebKit && isZooming ?
              "transform var(--transition-duration-fast) ease-out"
            : undefined,
        }}
      >
        <ReticleContainer
          style={{
            scale: RETICLE_SCALE,
            display: isReticleVisible ? undefined : "none",
            ...(coords && {
              transform: `translate(${reticleOffset.x}px, ${reticleOffset.y}px)`,
            }),
          }}
        >
          {color && (
            <PreviewPixel
              style={{
                width: PREVIEW_PIXEL_SIZE,
                height: PREVIEW_PIXEL_SIZE,
                top: (RETICLE_SIZE - PREVIEW_PIXEL_SIZE) / 2,
                left: (RETICLE_SIZE - PREVIEW_PIXEL_SIZE) / 2,
                backgroundColor: `rgba(${color?.rgba.join()})`,
              }}
            />
          )}
          <Reticle
            src="/images/reticle.png"
            alt="Reticle"
            className="reticle"
            style={{
              width: RETICLE_SIZE,
              height: RETICLE_SIZE,
              // These min sizes prevent the reticle being squished which causes it to be misalignment.
              minWidth: RETICLE_SIZE,
              minHeight: RETICLE_SIZE,
            }}
          />
        </ReticleContainer>
        <SelectedBoundsOverlay
          canvasWidth={canvas.width}
          canvasHeight={canvas.height}
          canEdit={canEdit}
          minHeight={minHeight}
          minWidth={minWidth}
          selectedBounds={selectedBounds}
          reticleScale={RETICLE_SCALE}
          reticleSize={RETICLE_SIZE}
          setSelectedBounds={setSelectedBounds}
          zoom={zoom}
        />
        <CanvasImageWrapper
          aria-busy={isLaunching || isLoading}
          ref={canvasImageWrapperRef}
          isLoading={isLoading}
          isLaunching={isLaunching}
          id="canvas-image-wrapper"
        >
          {/* biome-ignore lint/performance/noImgElement: We don’t want Next resizing pixel art */}
          <img
            alt="Active Blurple Canvas"
            onLoad={(event) => handleLoadImage(event.currentTarget)}
            ref={imageRef}
            src={sourceImage?.src}
            crossOrigin="anonymous"
            // Minimum width and height need to be forced to prevent incorrect clampScale and reticle placements
            style={{ minWidth: canvas.width, minHeight: canvas.height }}
          />
        </CanvasImageWrapper>
      </div>
      {isLoading && <CircularProgress style={{ position: "absolute" }} />}
    </CanvasContainer>
  );
}
