import type {
  DiscordUserProfile,
  Palette,
  PaletteColor,
} from "@blurple-canvas-web/types";
import { Skeleton, styled } from "@mui/material";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useAuthContext,
  useCanvasContext,
  useSelectedColorContext,
} from "@/contexts";
import { usePalette, usePlaySound } from "@/hooks";
import { getUserGuildIds } from "@/util";
import { DynamicAnchorButton, PlacePixelButton } from "../../button";
import { InteractiveSwatch } from "../../swatch";
import { Heading } from "../ActionPanel";
import {
  ActionPanelTabBody,
  FullWidthScrollView,
  TabPanel,
} from "./ActionPanelTabBody";
import { BotPlaceCommandCard } from "./BotCommandCard";
import ColorInfoCard from "./SelectedColorInfoCard";

const Fieldset = styled("fieldset")`
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

const PlacePixelTabBlock = styled(TabPanel)`
  grid-template-rows: 1fr auto;
`;

const SwatchSkeleton = styled(Skeleton)`
  aspect-ratio: 1;
  border-radius: 0.5rem;
  width: 100%;
  height: auto;
`;

function partitionPalette(palette: Palette): [Palette, Palette] {
  const mainColors: Palette = [];
  const partnerColors: Palette = [];
  for (const color of palette) {
    (color.global ? mainColors : partnerColors).push(color);
  }

  return [mainColors, partnerColors];
}

function isUserInServer(user: DiscordUserProfile, serverId: string) {
  const guildIds = getUserGuildIds(user);
  return guildIds.includes(serverId);
}

interface PlacePixelTabProps extends React.ComponentPropsWithRef<
  typeof PlacePixelTabBlock
> {
  active?: boolean;
  eventId: number | null;
}

export default function PlacePixelTab({
  active = false,
  eventId,
  ...props
}: PlacePixelTabProps) {
  const { data: palette } = usePalette(eventId ?? undefined);
  const [mainColors, partnerColors] = useMemo(
    () => (palette !== undefined ? partitionPalette(palette) : []),
    [palette],
  );
  // Boolean to hide certain elements when the tab is too small
  // Current implementation is a bit jarring when things pop in and out
  const [isLarge, setIsLarge] = useState(true);
  const playSound = usePlaySound("pick_color");

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

  const { color: selectedColor, setColor } = useSelectedColorContext();

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

  function setSelectedColor(color: PaletteColor | null) {
    playSound();
    setColor(color);
  }

  return (
    <PlacePixelTabBlock {...props} active={active} ref={PlacePixelTabBlockRef}>
      <FullWidthScrollView>
        <ActionPanelTabBody>
          <div>
            <NamedPalette colors={mainColors} name="Main colors" />
            <NamedPalette colors={partnerColors} name="Partner colors" />
          </div>
        </ActionPanelTabBody>
      </FullWidthScrollView>
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
          <DynamicAnchorButton
            color={selectedColor?.rgba}
            href={serverInvite}
            type="submit"
          >
            {!userInServer ? "Join" : "Open"}{" "}
            {selectedColor?.guildName ?? "server"}
          </DynamicAnchorButton>
        )}
        {!readOnly && isLarge && <BotPlaceCommandCard />}
      </ActionPanelTabBody>
    </PlacePixelTabBlock>
  );
}

interface NamedPaletteProps {
  colors: Palette | undefined;
  name: React.ReactNode;
}

function NamedPalette({ colors, name }: NamedPaletteProps) {
  const { color: selectedColor, setColor } = useSelectedColorContext();
  if (colors?.length === 0) return null;
  const isLoading = colors === undefined;
  return (
    <>
      <Heading>{name}</Heading>
      <Fieldset>
        {isLoading ?
          Array.from({ length: 12 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: These will never change
            <SwatchSkeleton key={i} variant="rectangular" />
          ))
        : colors.map((color) => (
            <InteractiveSwatch
              aria-selected={color === selectedColor}
              key={color.code}
              onClick={() => setColor(color)}
              paletteColor={color}
            />
          ))
        }
      </Fieldset>
    </>
  );
}
