/**
 * DO NOT USE THIS MODULE
 *
 * It has been deprecated.
 */

"use client";

import { PaletteColor } from "@blurple-canvas-web/types";
import { styled } from "@mui/material";

const ColorContainer = styled("div")`
  align-items: center;
  display: flex;
  gap: 0.5rem;
`;

interface ColorProps {
  color: PaletteColor;
  displayName?: boolean;
}

export const PaletteColorRecord = ({
  color,
  displayName = true,
}: ColorProps) => {
  return (
    <ColorContainer className="colorRecord">
      {displayName && <p className="colorName">{color.name}</p>}
    </ColorContainer>
  );
};
