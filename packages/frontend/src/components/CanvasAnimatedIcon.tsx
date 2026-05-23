"use client";

import CanvasIcon, { type CanvasIconProps } from "./CanvasIcon";

export type CanvasAnimatedIconProps = Omit<CanvasIconProps, "loading">;

/** @deprecated Use <CanvasIcon loading /> instead. */
export default function CanvasAnimatedIcon(props: CanvasAnimatedIconProps) {
  return <CanvasIcon loading {...props} />;
}
