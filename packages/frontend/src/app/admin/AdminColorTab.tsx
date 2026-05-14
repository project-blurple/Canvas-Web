"use client";

import { styled } from "@mui/material";
import { TabPanel } from "@/components/action-panel/tabs/ActionPanelTabBody";
import { partitionPaletteByOwner } from "@/components/action-panel/tabs/PlacePixelTab";
import { StyledSwatch } from "@/components/swatch/InteractiveSwatch";
import { usePalette } from "@/hooks";

const AdminColorTabBlock = styled(TabPanel)`
  grid-template-rows: auto 1fr;
`;

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

interface AdminColorTabProps extends React.ComponentPropsWithRef<
  typeof AdminColorTabBlock
> {
  active: boolean;
}

export default function AdminColorTab({
  active,
  ...props
}: AdminColorTabProps) {
  const { data: palette = [] } = usePalette(undefined, true);
  const [mainColors, partnerColors] = partitionPaletteByOwner(palette);

  // If there are partner colors, sort them so that the ones with guilds are at the top
  partnerColors.sort((a, b) =>
    a.guildId !== null && b.guildId !== null ? 0
    : a.guildId !== null ? -1
    : 1,
  );

  return (
    <AdminColorTabBlock active={active} {...props}>
      {palette.length === 0 ?
        "No colors found."
      : <>
          <ColorList>
            <h2>Global colors</h2>
            {mainColors.length > 0 &&
              mainColors.map((color) => (
                <ColorWrapper key={color.id}>
                  <StyledSwatch key={color.code} paletteColor={color} />
                  {color.name}
                </ColorWrapper>
              ))}
          </ColorList>

          <ColorList>
            <h2>Partner colors</h2>
            {partnerColors.length > 0 &&
              partnerColors.map((color) => (
                <ColorWrapper key={color.id}>
                  <StyledSwatch key={color.code} paletteColor={color} />
                  {color.name}
                  {color.guildId && ` (Guild ID: ${color.guildId})`}
                </ColorWrapper>
              ))}
          </ColorList>
        </>
      }
    </AdminColorTabBlock>
  );
}
