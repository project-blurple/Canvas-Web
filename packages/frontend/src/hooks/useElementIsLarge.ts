import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Hook to observe an element's height and return whether it's "large" based
 * on a rem-based threshold.
 *
 * @param thresholdRem Number of rems (e.g. 30) to compare element height against
 * @returns [refCallback, isLarge]
 */
export function useElementIsLarge(thresholdRem = 30) {
  const [isLarge, setIsLarge] = useState(true);
  const [remPixels, setRemPixels] = useState<number>(16);
  const observerRef = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    setRemPixels(
      Number.parseFloat(getComputedStyle(document.documentElement).fontSize),
    );
  }, []);

  const ref = useCallback(
    (elem: HTMLDivElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      if (!elem) return;
      const obs = new ResizeObserver((entries) => {
        const height = entries[0].target.clientHeight;
        setIsLarge(height > remPixels * thresholdRem);
      });
      obs.observe(elem);
      observerRef.current = obs;
    },
    [remPixels, thresholdRem],
  );

  return [ref, isLarge] as const;
}
