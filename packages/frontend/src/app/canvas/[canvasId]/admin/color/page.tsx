"use client";

import type { Palette } from "@blurple-canvas-web/types";
import { styled } from "@mui/material";
import {
  partitionPaletteByOwner,
  partitionPaletteByParticipation,
} from "@/components/action-panel/tabs/place/PlacePixelTab";
import CanvasIcon from "@/components/CanvasIcon";
import { StaticSwatch } from "@/components/swatch/StaticSwatch";
import { useCanvasContext } from "@/contexts/CanvasContext";
import { usePalette } from "@/hooks/queries/usePalette";
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
  font-size: 0.875rem;
  gap: 1.5rem;
  grid-template-columns: repeat(auto-fit, minmax(14em, 1fr));
`;

const ColorCard = styled("li")`
  column-gap: 1em;
  display: grid;
  grid-template-columns: 3rem auto;
`;

const ColorCardText = styled("div")`
  * + * {
    margin-block-start: 0.5em;
  }
`;

const GuildId = styled("code")`
  color: var(--discord-legacy-muted);
  display: block;
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
      {colors.length === 0 ?
        <p>No colors found</p>
      : <ColorList role="list">
          {colors.map((color) => (
            <ColorCard key={color.id}>
              <StaticSwatch aria-hidden paletteColor={color} />
              <ColorCardText>
                <p style={{ textBoxTrim: "trim-start" }}>{color.name}</p>
                <code>{color.code}</code>
                {color.guildId && <GuildId>{color.guildId}</GuildId>}
              </ColorCardText>
            </ColorCard>
          ))}
        </ColorList>
      }
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
          <p>No colors found</p>
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
