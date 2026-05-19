import type { PaletteColor } from "@blurple-canvas-web/types";
import { styled } from "@mui/material";
import { rgbaToCssColor } from "@/util/color";
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

  return (
    <SwatchBase
      style={{ ...style, backgroundColor: rgbaToCssColor(rgba) }}
      {...props}
    >
      <VisuallyHidden>{name}</VisuallyHidden>
    </SwatchBase>
  );
}
