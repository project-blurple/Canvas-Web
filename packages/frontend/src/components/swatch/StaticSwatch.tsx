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

function rgbaToCssString(
  rgba: [number, number, number, number],
): `rgb(${string} ${string} ${string} / ${string})` {
  // Convert [255, 255, 255, 255] to rgb(255 255 255 / 1.0)
  const alphaFloat = rgba[3] / 0xff;
  return `rgb(${rgba[0]} ${rgba[1]} ${rgba[2]} / ${alphaFloat})`;
}

export function StaticSwatch({
  paletteColor,
  style,
  ...props
}: StaticSwatchProps) {
  const { name, rgba } = paletteColor;

  return (
    <SwatchBase
      style={{ ...style, backgroundColor: rgbaToCssString(rgba) }}
      {...props}
    >
      <VisuallyHidden>{name}</VisuallyHidden>
    </SwatchBase>
  );
}
