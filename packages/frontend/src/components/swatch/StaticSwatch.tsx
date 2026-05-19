import type { PaletteColor } from "@blurple-canvas-web/types";
import { styled } from "@mui/material";
import VisuallyHidden from "../VisuallyHidden";

const SwatchBase = styled("div", {
  shouldForwardProp: (prop) => prop !== "swatchColor",
})<{ swatchColor: string }>`
  --swatch-color: ${({ swatchColor }) => swatchColor};

  aspect-ratio: 1;
  background-color: var(--swatch-color);
  border-radius: 0.5rem;
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

export interface StaticSwatchProps extends Omit<
  React.ComponentPropsWithRef<typeof SwatchBase>,
  "swatchColor"
> {
  paletteColor: Pick<PaletteColor, "name" | "rgba">;
}

export function StaticSwatch({
  paletteColor,
  children,
  ...props
}: StaticSwatchProps) {
  const { name, rgba } = paletteColor;

  // Convert [255, 255, 255, 255] to rgb(255 255 255 / 1.0)
  const rgb = rgba.slice(0, 3).join(" ");
  const alphaFloat = rgba[3] / 255;

  return (
    <SwatchBase swatchColor={`rgb(${rgb} / ${alphaFloat})`} {...props}>
      <VisuallyHidden>{name}</VisuallyHidden>
      {children}
    </SwatchBase>
  );
}
