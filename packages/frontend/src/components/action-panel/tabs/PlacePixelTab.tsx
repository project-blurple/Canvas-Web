import { DiscordUserProfile, Palette } from "@blurple-canvas-web/types";
import { Skeleton, styled } from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import {
  useAuthContext,
  useCanvasContext,
  useSelectedColorContext,
} from "@/contexts";
import { usePalette } from "@/hooks";
import { decodeUserGuildsBase64 } from "@/util";
import { DynamicAnchorButton, PlacePixelButton } from "../../button";
import { InteractiveSwatch } from "../../swatch";
import { Heading } from "../ActionPanel";
import {
  ActionPanelTabBody,
  ScrollBlock,
  TabBlock,
} from "./ActionPanelTabBody";
import BotCommandCard, { PlaceBotCommandCard } from "./BotCommandCard";
import ColorInfoCard from "./SelectedColorInfoCard";

const ColorPicker = styled("div")`
  --min-swatch-width: 3rem;

  display: grid;
  gap: 0.25rem;
  grid-template-columns: repeat(
    auto-fill,
    minmax(var(--min-swatch-width), 1fr)
  );

  ${({ theme }) => theme.breakpoints.up("lg")} {
    --min-swatch-width: 3.5rem;
  }
`;

const PlacePixelTabBlock = styled(TabBlock)`
  grid-template-rows: 1fr auto;
`;

export const CoordinateLabel = styled("span")`
  opacity: 0.6;
`;

const SwatchSkeleton = styled(Skeleton)`
  aspect-ratio: 1;
  border-radius: 0.5rem;
  width: 100%;
  height: auto;
`;

export const partitionPalette = (palette: Palette) => {
  const mainColors: Palette = [];
  const partnerColors: Palette = [];
  for (const color of palette) {
    (color.global ? mainColors : partnerColors).push(color);
  }

  return [mainColors, partnerColors];
};

function isUserInServer(user: DiscordUserProfile, serverId: string) {
  const guildIds = decodeUserGuildsBase64(user);
  return guildIds.includes(serverId);
}

interface PlacePixelTabProps {
  active?: boolean;
  eventId: number | null;
}

export default function PlacePixelTab({
  active = false,
  eventId,
}: PlacePixelTabProps) {
  const { data: palette = [] } = usePalette(eventId ?? undefined);
  const [mainColors, partnerColors] = partitionPalette(palette);
  // Boolean to hide certain elements when the tab is too small
  // Current implementation is a bit jarring when things pop in and out
  const [isLarge, setIsLarge] = useState(true);

  // Get value of the rem in pixels (and only run it client-side)
  const [remPixels, setRemPixels] = useState<number>(16);
  useEffect(() => {
    // This runs only in the browser after hydration
    setRemPixels(
      Number.parseFloat(getComputedStyle(document.documentElement).fontSize),
    );
  }, []);

  const PlacePixelTabBlockRef = useCallback(
    (elem: HTMLDivElement | null) => {
      if (!elem) return;
      const resizeObserver = new ResizeObserver((entries) => {
        const height = entries[0].target.clientHeight;
        setIsLarge(height > remPixels * 20);
      });
      resizeObserver.observe(elem);
    },
    [remPixels],
  );

  const { color: selectedColor, setColor: setSelectedColor } =
    useSelectedColorContext();

  const { user } = useAuthContext();
  const { canvas } = useCanvasContext();

  const inviteSlug = selectedColor?.invite;
  const hasInvite = !!inviteSlug;
  const serverInvite =
    hasInvite ? `https://discord.gg/${inviteSlug}` : undefined;

  const webPlacingEnabled = canvas.webPlacingEnabled;
  const allColorsGlobal = canvas.allColorsGlobal;

  const canPlacePixel =
    webPlacingEnabled &&
    (!selectedColor || selectedColor.global || allColorsGlobal);

  const readOnly = canvas.isLocked;

  const isJoinServerShown =
    (!(canPlacePixel && user) || readOnly) &&
    !selectedColor?.global &&
    serverInvite;

  const userInServer =
    (user &&
      selectedColor &&
      !selectedColor.global &&
      isUserInServer(user, selectedColor?.guildId)) ??
    false;

  return (
    <PlacePixelTabBlock active={active} ref={PlacePixelTabBlockRef}>
      <ScrollBlock>
        <ActionPanelTabBody>
          <ColorPicker>
            <Heading>Main colors</Heading>
            {mainColors.length ?
              mainColors.map((color) => (
                <InteractiveSwatch
                  key={color.code}
                  rgba={color.rgba}
                  onAction={() => setSelectedColor(color)}
                  selected={color === selectedColor}
                />
              ))
            : Array.from({ length: 12 }).map((_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: These will never change
                <SwatchSkeleton key={i} variant="rectangular" />
              ))
            }
            <Heading>Partner colors</Heading>
            {partnerColors.length ?
              partnerColors.map((color) => (
                <InteractiveSwatch
                  key={color.code}
                  onAction={() => setSelectedColor(color)}
                  rgba={color.rgba}
                  selected={color === selectedColor}
                />
              ))
            : Array.from({ length: 13 }).map((_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: These will never change
                <SwatchSkeleton key={i} variant="rectangular" />
              ))
            }
          </ColorPicker>
        </ActionPanelTabBody>
      </ScrollBlock>
      <ActionPanelTabBody>
        {isLarge && (
          <ColorInfoCard
            color={selectedColor}
            invite={serverInvite}
            isUserInServer={userInServer}
          />
        )}
        {canPlacePixel && <PlacePixelButton isVerbose={!isLarge} />}
        {isJoinServerShown && (
          <DynamicAnchorButton color={selectedColor} href={serverInvite}>
            {!userInServer ? "Join" : "Open"}{" "}
            {selectedColor?.guildName ?? "server"}
          </DynamicAnchorButton>
        )}
        {!readOnly && isLarge && <PlaceBotCommandCard />}
      </ActionPanelTabBody>
    </PlacePixelTabBlock>
  );
}
