"use client";

import { useEffect } from "react";
import { DynamicButton } from "@/components/button";
import { useCanvasViewContext } from "@/contexts/CanvasViewContext";
import { useSelectedBoundsContext } from "@/contexts/SelectedBoundsContext";
import type { ViewBounds } from "@/util";

interface ComplexSearchBoundsSectionProps {
  active?: boolean;
  isSearching?: boolean;
  onSearch: (bounds: ViewBounds) => void;
}

export default function ComplexSearchBoundsSection({
  active = false,
  isSearching = false,
  onSearch,
}: ComplexSearchBoundsSectionProps) {
  const {
    setCanEdit,
    selectedBounds,
    setMinimumBounds,
    setBoundsToCurrentView,
    setShowSelectedBounds,
  } = useSelectedBoundsContext();
  const { containerRef } = useCanvasViewContext();

  useEffect(
    function initialiseBoundsFromCurrentView() {
      if (!active) return;
      if (!containerRef.current) return;

      if (selectedBounds) {
        setCanEdit(true);
        setShowSelectedBounds(true);
        return;
      }

      setBoundsToCurrentView(0.75);
      setMinimumBounds(1, 1);
      setCanEdit(true);
      setShowSelectedBounds(true);
    },
    [
      active,
      containerRef,
      selectedBounds,
      setBoundsToCurrentView,
      setMinimumBounds,
      setCanEdit,
      setShowSelectedBounds,
    ],
  );

  const pixelsInBounds =
    selectedBounds ?
      (selectedBounds.right - selectedBounds.left) *
      (selectedBounds.bottom - selectedBounds.top)
    : 0;

  function handleSearchClick() {
    if (!selectedBounds) return;

    setCanEdit(false);
    onSearch(selectedBounds);
  }

  return (
    <>
      <span>
        {selectedBounds?.top},{selectedBounds?.left} - {selectedBounds?.bottom},
        {selectedBounds?.right}
      </span>
      {pixelsInBounds > 10_000 && (
        <span>
          Warning: The selected area contains {pixelsInBounds.toLocaleString()}
          pixels. This may take a while to process.
        </span>
      )}
      <DynamicButton
        onClick={handleSearchClick}
        disabled={!selectedBounds || isSearching}
      >
        {!isSearching ? "Search" : "Searching..."}
      </DynamicButton>
    </>
  );
}
