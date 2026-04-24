"use client";

import { styled } from "@mui/material";
import { partitionPalette } from "@/components/action-panel/tabs/PlacePixelTab";
import {
  rgbaToCssString,
  StyledSwatchBase,
} from "@/components/swatch/InteractiveSwatch";
import { usePalette } from "@/hooks";
import Admin from "../Admin";

const ColorList = styled("div")`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const ColorWrapper = styled("div")`
  --min-swatch-width: 3rem;

  display: flex;
  flex-direction: row;
  gap: 1rem;
  height: var(--min-swatch-width);
`;

export default function AdminColorPage() {
  const { data: palette = [] } = usePalette(undefined, true);
  const [mainColors, partnerColors] = partitionPalette(palette);

  // If there are partner colors, sort them so that the ones with guilds are at the top
  partnerColors.sort((a, b) =>
    a.guildId !== null && b.guildId !== null ? 0
    : a.guildId !== null ? -1
    : 1,
  );

  return (
    <Admin>
      {palette.length === 0 ?
        "No colors found."
      : <>
          <ColorList>
            <h2>Global colors</h2>
            {mainColors.length > 0 &&
              mainColors.map((color) => (
                <ColorWrapper key={color.id}>
                  <StyledSwatchBase colorString={rgbaToCssString(color.rgba)} />
                  {color.name}
                </ColorWrapper>
              ))}
          </ColorList>

          <ColorList>
            <h2>Partner colors</h2>
            {partnerColors.length > 0 &&
              partnerColors.map((color) => (
                <ColorWrapper key={color.id}>
                  <StyledSwatchBase colorString={rgbaToCssString(color.rgba)} />
                  {color.name}
                  {color.guildId && ` (Guild ID: ${color.guildId})`}
                </ColorWrapper>
              ))}
          </ColorList>
        </>
      }
    </Admin>
  );
}
