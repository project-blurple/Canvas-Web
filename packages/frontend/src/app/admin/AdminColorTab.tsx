"use client";

import type { Palette } from "@blurple-canvas-web/types";
import { styled } from "@mui/material";
import { TabPanel } from "@/components/action-panel/tabs/ActionPanelTabBody";
import {
  partitionPaletteByOwner,
  partitionPaletteByParticipation,
} from "@/components/action-panel/tabs/PlacePixelTab";
import { StyledSwatch } from "@/components/swatch/InteractiveSwatch";
import { usePalette } from "@/hooks";

const AdminColorTabBlock = styled(TabPanel)`
  grid-template-rows: auto 1fr;
  max-width: 80rem;
  width: 100%;
`;

const ColorTabWrapper = styled("div")`
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
  width: 100%;
`;

const StyledColorListWrapper = styled("div")`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const ColorList = styled("div")`
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
`;

const ColorCard = styled("div")`
  --min-swatch-width: 3rem;

  display: flex;
  flex-direction: row;
  gap: 1rem;
  height: var(--min-swatch-width);
`;

const ColorCardText = styled("div")`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.875rem;
`;

const GuildId = styled("code")`
  font-size: 0.75rem;
  color: var(--discord-legacy-muted);
`;

function ColorListWrapper({
  colors,
  header,
}: {
  colors: Palette;
  header: string;
}) {
  return (
    <StyledColorListWrapper>
      <h2>{header}</h2>
      <ColorList>
        {colors.length > 0 ?
          colors.map((color) => (
            <ColorCard key={color.id}>
              <StyledSwatch key={color.code} paletteColor={color} />
              <ColorCardText>
                <span>{color.name}</span>
                <code>{color.code}</code>
                {color.guildId && <GuildId>{color.guildId}</GuildId>}
              </ColorCardText>
            </ColorCard>
          ))
        : "No colors found."}
      </ColorList>
    </StyledColorListWrapper>
  );
}

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
  const [participatingColors, nonParticipatingColors] =
    partitionPaletteByParticipation(partnerColors);

  return (
    <AdminColorTabBlock active={active} {...props}>
      {palette.length === 0 ?
        "No colors found."
      : <ColorTabWrapper>
          <ColorListWrapper colors={mainColors} header="Global colors" />
          <ColorListWrapper
            colors={participatingColors}
            header="Participating partner colors"
          />
          <ColorListWrapper
            colors={nonParticipatingColors}
            header="Non-participating partner colors"
          />
        </ColorTabWrapper>
      }
    </AdminColorTabBlock>
  );
}
