"use client";

import type { Palette } from "@blurple-canvas-web/types";
import { styled } from "@mui/material";
import {
  partitionPaletteByOwner,
  partitionPaletteByParticipation,
} from "@/components/action-panel/tabs/place/PlacePixelTab";
import CanvasIcon from "@/components/CanvasIcon";
import { StyledSwatch } from "@/components/swatch/InteractiveSwatch";
import { useCanvasContext } from "@/contexts";
import { usePalette } from "@/hooks";
import AdminDashboard from "../AdminDashboard";

const AdminColorTabBlock = styled("section")`
  display: block;
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

const ColorList = styled("ul")`
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
`;

const ColorCard = styled("li")`
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
  color: var(--discord-legacy-muted);
  font-size: 0.75rem;
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
      <ColorList role="list">
        {colors.length > 0 ?
          colors.map((color) => (
            <ColorCard key={color.id}>
              <StyledSwatch paletteColor={color} />
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

function AdminColorTab() {
  const { canvas } = useCanvasContext();
  const { data: palette, isLoading } = usePalette(
    canvas.eventId ?? undefined,
    true,
  );
  const [mainColors, partnerColors] =
    palette ? partitionPaletteByOwner(palette) : [[], []];
  const [participatingColors, nonParticipatingColors] =
    partitionPaletteByParticipation(partnerColors);

  return (
    <AdminColorTabBlock>
      <ColorTabWrapper>
        {isLoading || palette === undefined ?
          <CanvasIcon
            loading
            size={64}
            style={{
              color: "var(--discord-blurple)",
              margin: "auto",
              opacity: 0.5,
            }}
          />
        : palette.length === 0 ?
          "No colors found."
        : <>
            <ColorListWrapper colors={mainColors} header="Global colors" />
            <ColorListWrapper
              colors={participatingColors}
              header="Participating partner colors"
            />
            <ColorListWrapper
              colors={nonParticipatingColors}
              header="Non-participating partner colors"
            />
          </>
        }
      </ColorTabWrapper>
    </AdminColorTabBlock>
  );
}

export default function ColorAdminPage() {
  return (
    <AdminDashboard>
      <AdminColorTab />
    </AdminDashboard>
  );
}
