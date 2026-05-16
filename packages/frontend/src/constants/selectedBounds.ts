import type { BoundsDimensions } from "@/util";

export const COMPLEX_SEARCH_BOUNDS_MIN_SIZE = {
  width: 1,
  height: 1,
} as const satisfies BoundsDimensions;

export const SELECTED_BOUNDS_DEFAULT_MIN_SIZE = {
  width: 5,
  height: 5,
} as const satisfies BoundsDimensions;
