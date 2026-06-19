"use client";

import type { Frame } from "@blurple-canvas-web/types";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useFrameById } from "@/hooks/queries/useFrame";
import { useCanvasSearchParams } from "@/hooks/useCanvasSearchParams";
import { createUrlWithFrameUpdate } from "@/util/searchParams";

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

  // Track optimistic frame for instant UI updates
  const [optimisticFrame, setOptimisticFrame] = useState<Frame | null>(null);
  const optimisticFrameIdRef = useRef<string | null>(null);

  // Fetch frame data based on frameId from URL (for page loads/refreshes)
  const { data: urlFrame = null, isLoading } = useFrameById({
    frameId: canvasParams.frameId ?? undefined,
  });

  // Clear optimistic frame once URL-fetched frame arrives and matches
  useEffect(() => {
    if (urlFrame && urlFrame.id === optimisticFrameIdRef.current) {
      // URL caught up with our optimistic selection, clear it
      setOptimisticFrame(null);
      optimisticFrameIdRef.current = null;
    } else if (!canvasParams.frameId && optimisticFrameIdRef.current !== null) {
      // Frame was deselected (no frameId in URL), clear optimistic state
      setOptimisticFrame(null);
      optimisticFrameIdRef.current = null;
    }
  }, [urlFrame, canvasParams.frameId]);

  const frame = optimisticFrame ?? urlFrame;
  console.log(frame);

  const setFrame = useCallback(
    (newFrame: Frame | null) => {
      // Store optimistic frame for instant display
      setOptimisticFrame(newFrame);
      optimisticFrameIdRef.current = newFrame?.id ?? null;

      // Update URL asynchronously (non-blocking)
      const frameId = newFrame?.id ?? null;
      const newUrl = createUrlWithFrameUpdate(searchParams, frameId);
      router.replace(newUrl);
    },
    [searchParams, router],
  );

  return {
    frame,
    setFrame,
    isLoading,
  };
}
