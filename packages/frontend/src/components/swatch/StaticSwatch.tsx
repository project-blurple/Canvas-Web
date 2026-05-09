import type { PaletteColor } from "@blurple-canvas-web/types";
import { styled } from "@mui/material";
import VisuallyHidden from "../VisuallyHidden";

const SwatchBase = styled("div")`
  aspect-ratio: 1;
  border-radius: 0.5rem;
`;

export interface StaticSwatchProps extends React.ComponentPropsWithRef<
  typeof SwatchBase
> {
  paletteColor: Pick<PaletteColor, "name" | "rgba">;
}

export function StaticSwatch({
  paletteColor,
  style,
  ...props
}: StaticSwatchProps) {
  const { name, rgba } = paletteColor;

  // Convert [255, 255, 255, 255] to rgb(255 255 255 / 1.0)
  const rgb = rgba.slice(0, 3).join(" ");
  const alphaFloat = rgba[3] / 255;

  return (
    <SwatchBase
      style={{ ...style, backgroundColor: `rgb(${rgb} / ${alphaFloat})` }}
      {...props}
    >
      <VisuallyHidden>{name}</VisuallyHidden>
    </SwatchBase>
  );
}
