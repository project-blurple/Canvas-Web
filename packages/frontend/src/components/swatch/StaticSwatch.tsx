import type { PaletteColor } from "@blurple-canvas-web/types";
import { styled } from "@mui/material";
import type { CSSProperties } from "react";
import { rgbaToCssColor } from "@/util/color";
import VisuallyHidden from "../VisuallyHidden";

const SwatchBase = styled("div")`
  aspect-ratio: 1;
  background-color: var(--swatch-color);
  border-radius: 0.5rem;
  border: var(--card-border);
  color: contrast-color(var(--swatch-color));
  position: relative;

  @supports not (color: contrast-color(black)) {
    color: var(--swatch-color);
    filter: invert(1) grayscale(1) brightness(1.3) contrast(9000);
    mix-blend-mode: luminosity;
  }

  // Makes the VisuallyHidden label smaller and positioned higher so they do not overlap the lock icon (or less chance to overlap the name label). Color is inherited from the swatch's contrast color.
  & [data-vh-debug] {
    font-size: 0.5rem;
    inset-block-start: 2px;
    inset-inline: 2px;
    line-height: 1.1;
    overflow-wrap: anywhere;
    pointer-events: none;
    position: absolute;
    text-align: center;
  }
`;

export interface StaticSwatchProps extends React.ComponentPropsWithRef<
  typeof SwatchBase
> {
  paletteColor: Pick<PaletteColor, "name" | "rgba">;
}

export function StaticSwatch({
  children,
  paletteColor,
  ...props
}: StaticSwatchProps) {
  const { name, rgba } = paletteColor;

  return (
    <SwatchBase
      style={{ "--swatch-color": rgbaToCssColor(rgba) } as CSSProperties}
      {...props}
    >
      <VisuallyHidden>{name}</VisuallyHidden>
      {children}
    </SwatchBase>
  );
}
