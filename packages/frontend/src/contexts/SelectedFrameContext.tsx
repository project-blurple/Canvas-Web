"use client";

import type { Frame } from "@blurple-canvas-web/types";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useFrameById } from "@/hooks/queries/useFrame";
import { useCanvasSearchParams } from "@/hooks/useCanvasSearchParams";
import { createUrlWithFrameUpdate } from "@/util/searchParams";
import { useActionPanelContext } from "./ActionPanelContext";

interface UseSelectedFrameReturn {
  frame: Frame | null;
  setFrame: (frame: Frame | null) => void;
  isLoading: boolean;
}

/**
 * Hook for managing selected frame via URL search params.
 * Frame selection is stored entirely in the URL (f parameter), not in state.
 * This mirrors the pattern used for canvas ID and viewport params.
 *
 * Optimized to show frame data immediately when selected (from preloaded data in FrameList)
 * while the URL updates asynchronously in the background, eliminating perceived latency.
 */
export function useSelectedFrameContext(): UseSelectedFrameReturn {
  const router = useRouter();
  const searchParams = useSearchParams();
  const canvasParams = useCanvasSearchParams();
  const { setCurrentTab } = useActionPanelContext();

  // Track optimistic frame for instant UI updates
  const [optimisticFrame, setOptimisticFrame] = useState<Frame | null>(null);

  // Fetch frame data based on frameId from URL (for page loads/refreshes)
  const { data: urlFrame = null, isLoading } = useFrameById({
    frameId: canvasParams.frameId ?? undefined,
  });

  // Clear optimistic frame once URL-fetched frame arrives and matches
  useEffect(() => {
    if (urlFrame && urlFrame.id === optimisticFrame?.id) {
      // URL caught up with our optimistic selection, clear it
      setOptimisticFrame(null);
    } else if (!canvasParams.frameId && optimisticFrame !== null) {
      // Frame was deselected (no frameId in URL), clear optimistic state
      setOptimisticFrame(null);
    }
  }, [urlFrame, canvasParams.frameId, optimisticFrame]);

  // Switch to frame tab when loading a frame from URL (e.g., on page load with frame param)
  useEffect(() => {
    if (urlFrame && optimisticFrame === null) {
      setCurrentTab("frame");
    }
  }, [urlFrame, optimisticFrame, setCurrentTab]);

  const frame = optimisticFrame ?? urlFrame;

  const setFrame = useCallback(
    (newFrame: Frame | null) => {
      // Store optimistic frame for instant display
      setOptimisticFrame(newFrame);

      // Switch to frame tab when a frame is selected
      if (newFrame) {
        setCurrentTab("frame");
      }

      // Update URL asynchronously (non-blocking)
      const frameId = newFrame?.id ?? null;
      const newUrl = createUrlWithFrameUpdate(searchParams, frameId);
      router.replace(newUrl);
    },
    [searchParams, router, setCurrentTab],
  );

  return {
    frame,
    setFrame,
    isLoading,
  };
}
