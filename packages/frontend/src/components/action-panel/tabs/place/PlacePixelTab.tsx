import type { DiscordUserProfile, Palette } from "@blurple-canvas-web/types";
import { Skeleton, styled } from "@mui/material";
import { AxiosError } from "axios";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useAuthContext,
  useCanvasContext,
  useCanvasViewContext,
  useSelectedColorContext,
} from "@/contexts";
import { usePalette, usePlayCooldownExpirySound, usePlaySound } from "@/hooks";
import { getUserGuildIds } from "@/util";
import { DynamicAnchorButton } from "../../../button";
import { InteractiveSwatch } from "../../../swatch";
import ActionPanelPrimitives from "../../primitives";
import { ActionPanelTabBody, TabPanel } from "../ActionPanelTabBody";
import { BotPlaceCommandCard } from "../BotCommandCard";
import ColorInfoCard from "../SelectedColorInfoCard";
import PlacePixelButton from "./PlacePixelButton";
import usePlacePixelMutation from "./usePlacePixelMutation";

/**
 * Just here for semantics, but let parent grid “pass through”. Similar to setting
 * `display: contents`, but fewer a11y quirks.
 * @see https://ericwbailey.design/published/display-contents-considered-harmful
 */
const Form = styled("form")`
  display: inherit;
  grid-column: 1 / -1;
  grid-row: 1 / -1;
  grid-template-columns: subgrid;
  grid-template-rows: subgrid;
`;

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

export function partitionPaletteByOwner(palette: Palette): [Palette, Palette] {
  const mainColors: Palette = [];
  const partnerColors: Palette = [];
  for (const color of palette) {
    (color.global ? mainColors : partnerColors).push(color);
  }

  return [mainColors, partnerColors];
}

export function partitionPaletteByParticipation(
  palette: Palette,
): [Palette, Palette] {
  const participatingColors: Palette = [];
  const nonParticipatingColors: Palette = [];
  for (const color of palette) {
    (color.guildId ? participatingColors : nonParticipatingColors).push(color);
  }

  return [participatingColors, nonParticipatingColors];
}

function isUserInServer(user: DiscordUserProfile, serverId: string | null) {
  if (!serverId) return false;
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
  const { signOut } = useAuthContext();
  const { coords, setCoords } = useCanvasViewContext();
  const playCooldownExpirySound = usePlayCooldownExpirySound();
  const playPixelPlacementSound = usePlaySound("place_pixel");
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [prevTimeLeft, setPrevTimeLeft] = useState(0);

  const { data: palette } = usePalette(eventId ?? undefined);

  const [mainColors, partnerColors] = useMemo(
    () => (palette !== undefined ? partitionPaletteByOwner(palette) : []),
    [palette],
  );
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

  const { color: selectedColor } = useSelectedColorContext();

  const { user } = useAuthContext();
  const {
    canvas: { allColorsGlobal, isLocked: readOnly, webPlacingEnabled },
  } = useCanvasContext();

  const inviteSlug = selectedColor?.invite;
  const hasInvite = !!inviteSlug;
  const serverInvite =
    hasInvite ? `https://discord.gg/${inviteSlug}` : undefined;

  const canPlacePixel =
    webPlacingEnabled &&
    (!selectedColor || selectedColor.global || allColorsGlobal);

  const isJoinServerShown =
    (!(canPlacePixel && user) || readOnly) &&
    !selectedColor?.global &&
    serverInvite;

  const userInServer = Boolean(
    user &&
    selectedColor &&
    !selectedColor.global &&
    isUserInServer(user, selectedColor?.guildId),
  );

  const { mutateAsync, isPending: isPlacing } = usePlacePixelMutation({
    onError: (error) => {
      if (error instanceof AxiosError && error.status === 401) signOut();
      alert("Failed to place pixel, please refresh the page");
    },
    onSuccess: (data) => {
      const cooldown = data.cooldownEndTime;
      if (cooldown) setCooldownSeconds(Math.ceil(cooldown / 1000));
    },
  });

  const onSubmit: React.SubmitEventHandler<HTMLFormElement> = async (e) => {
    console.log(e);
    e.preventDefault();
    if (!coords || !selectedColor) return;
    playPixelPlacementSound();
    await mutateAsync();
    setCoords(null);
  };

  useEffect(
    function tickCountdown() {
      if (cooldownSeconds > 0) {
        const timerId = setTimeout(
          () => setCooldownSeconds(cooldownSeconds - 1),
          1000,
        );
        return () => clearTimeout(timerId);
      }
      setCooldownSeconds(0);
    },
    [cooldownSeconds],
  );

  useEffect(
    function playJingleWhenCooldownExpires() {
      if (prevTimeLeft > 0 && cooldownSeconds === 0) playCooldownExpirySound();
      setPrevTimeLeft(cooldownSeconds);
    },
    [playCooldownExpirySound, prevTimeLeft, cooldownSeconds],
  );

  return (
    <PlacePixelTabBlock {...props} active={active} ref={PlacePixelTabBlockRef}>
      <Form onSubmit={onSubmit}>
        <ActionPanelTabBody>
          <div>
            <NamedPalette
              colors={mainColors}
              disabled={isPlacing}
              name="Main colors"
            />
            <NamedPalette
              colors={partnerColors}
              disabled={isPlacing}
              name="Partner colors"
            />
          </div>
        </ActionPanelTabBody>
        <ActionPanelTabBody>
          {isLarge && (
            <ColorInfoCard
              color={selectedColor}
              invite={serverInvite}
              isUserInServer={userInServer}
            />
          )}
          {canPlacePixel && (
            <PlacePixelButton
              aria-busy={isPlacing}
              cooldownSeconds={cooldownSeconds}
              disabled={!canPlacePixel}
              isVerbose={!isLarge}
              type="submit"
            />
          )}
          {isJoinServerShown && (
            <DynamicAnchorButton
              color={selectedColor?.rgba}
              href={serverInvite}
            >
              {!userInServer ? "Join" : "Open"}{" "}
              {selectedColor?.guildName ?? "server"}
            </DynamicAnchorButton>
          )}
          {!readOnly && isLarge && <BotPlaceCommandCard />}
        </ActionPanelTabBody>
      </Form>
    </PlacePixelTabBlock>
  );
}

interface NamedPaletteProps {
  colors: Palette | undefined;
  disabled?: boolean | undefined;
  name: React.ReactNode;
}

function NamedPalette({ colors, disabled, name }: NamedPaletteProps) {
  const { color: selectedColor, setColor } = useSelectedColorContext();
  const playSound = usePlaySound("pick_color");

  if (colors?.length === 0) return null;
  const isLoading = colors === undefined;
  return (
    <>
      <ActionPanelPrimitives.SectionHeading>
        {name}
      </ActionPanelPrimitives.SectionHeading>
      <Fieldset disabled={disabled}>
        {isLoading ?
          Array.from({ length: 12 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: These will never change
            <SwatchSkeleton key={i} variant="rectangular" />
          ))
        : colors.map((color) => (
            <InteractiveSwatch
              aria-selected={color === selectedColor}
              key={color.code}
              onClick={() => {
                playSound();
                setColor(color);
              }}
              paletteColor={color}
              role="option"
            />
          ))
        }
      </Fieldset>
    </>
  );
}
