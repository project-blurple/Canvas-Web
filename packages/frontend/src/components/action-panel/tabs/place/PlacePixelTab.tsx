import type {
  DiscordUserProfile,
  Palette,
  PaletteColor,
} from "@blurple-canvas-web/types";
import { Skeleton, styled } from "@mui/material";
import { AxiosError } from "axios";
import type React from "react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { EyedropperSwatch } from "@/components/swatch/InteractiveSwatch";
import {
  useActionPanelContext,
  useAuthContext,
  useCanvasContext,
  useCanvasViewContext,
  useSelectedColorContext,
} from "@/contexts";
import { usePalette, usePlaySound } from "@/hooks";
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

function isColorUnavailable(
  color: PaletteColor,
  allColorsGlobal: boolean,
  user: DiscordUserProfile | null | undefined,
): boolean {
  if (color.global || allColorsGlobal) return false;
  if (!color.guildId) return true;
  return !user || !isUserInServer(user, color.guildId);
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
  const { user } = useAuthContext();
  const {
    canvas: { allColorsGlobal, isLocked: readOnly, webPlacingEnabled },
  } = useCanvasContext();
  const { cooldownEndTime, setCooldownEndTime } = useActionPanelContext();
  const { signOut } = useAuthContext();
  const { coords, setCoords } = useCanvasViewContext();
  const playPixelPlacementSound = usePlaySound("place_pixel");

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!cooldownEndTime) return () => {};
      const id = setInterval(onStoreChange, 1000);
      const remainingMs = Math.max(0, cooldownEndTime - Date.now());
      /** Make sure final 1 → 0 tick isn’t missed, else ‘Place pixel’ can get stuck disabled */
      const cooldownExpiryId = setTimeout(function declareFinalTick() {
        onStoreChange();
        clearInterval(cooldownExpiryId);
      }, remainingMs);

      return () => {
        clearInterval(id);
        clearTimeout(cooldownExpiryId);
      };
    },
    [cooldownEndTime],
  );
  const getSnapshot = useCallback(
    () =>
      cooldownEndTime ?
        Math.max(0, Math.ceil((cooldownEndTime - Date.now()) / 1000))
      : 0,
    [cooldownEndTime],
  );
  const cooldownSeconds = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getSnapshot,
  );

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

  const inviteSlug = selectedColor?.invite;
  const hasInvite = !!inviteSlug;
  const serverInvite =
    hasInvite ? `https://discord.gg/${inviteSlug}` : undefined;

  const userInServer = Boolean(
    user &&
    selectedColor &&
    !selectedColor.global &&
    selectedColor.guildId &&
    isUserInServer(user, selectedColor.guildId),
  );

  const partnerServerJoinRequired = Boolean(
    selectedColor && !selectedColor.global && !allColorsGlobal && !userInServer,
  );

  const canPlacePixel =
    webPlacingEnabled &&
    (!selectedColor || selectedColor.global || allColorsGlobal || userInServer);

  const isJoinServerShown =
    (!(canPlacePixel && user) || readOnly) &&
    !selectedColor?.global &&
    serverInvite;

  const isColorDisabled = useCallback(
    (color: PaletteColor) => isColorUnavailable(color, allColorsGlobal, user),
    [allColorsGlobal, user],
  );

  const { mutateAsync, isPending: isPlacing } = usePlacePixelMutation({
    onError: (error) => {
      if (error instanceof AxiosError && error.status === 401) signOut();
      alert("Failed to place pixel, please refresh the page");
    },
    onSuccess: (data) => {
      const cooldown = data.cooldownEndTime;
      if (cooldown) setCooldownEndTime(Date.now() + cooldown);
    },
  });

  const onSubmit: React.SubmitEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    if (!coords || !selectedColor) return;
    playPixelPlacementSound();
    await mutateAsync();
    setCoords(null);
  };

  return (
    <PlacePixelTabBlock {...props} active={active} ref={PlacePixelTabBlockRef}>
      <Form onSubmit={onSubmit}>
        <ActionPanelTabBody>
          <div>
            <NamedPalette
              colors={mainColors}
              name="Main colors"
              includeEyedropper
            />
            <NamedPalette
              colors={partnerColors}
              isColorDisabled={isColorDisabled}
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
          {(canPlacePixel ||
            (partnerServerJoinRequired && !isJoinServerShown)) && (
            <PlacePixelButton
              aria-busy={isPlacing}
              cooldownSeconds={cooldownSeconds}
              disabled={!canPlacePixel}
              isVerbose={!isLarge}
              partnerServerJoinRequired={partnerServerJoinRequired}
              partnerServerName={selectedColor?.guildName ?? null}
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
  isColorDisabled?: (color: PaletteColor) => boolean;
  name: React.ReactNode;
  includeEyedropper?: boolean;
}

function NamedPalette({
  colors,
  isColorDisabled,
  name,
  includeEyedropper = false,
}: NamedPaletteProps) {
  const { color: selectedColor, setColor } = useSelectedColorContext();
  const { selectedPixelColor: selectedPixelColorRgb } = useCanvasViewContext();
  const playSound = usePlaySound("pick_color");

  if (colors?.length === 0) return null;
  const isLoading = colors === undefined;

  const selectedPixelColor =
    colors?.find(
      (color) =>
        color.rgba[0] === selectedPixelColorRgb?.[0] &&
        color.rgba[1] === selectedPixelColorRgb?.[1] &&
        color.rgba[2] === selectedPixelColorRgb?.[2] &&
        color.rgba[3] === selectedPixelColorRgb?.[3],
    ) ?? null;

  return (
    <>
      <ActionPanelPrimitives.SectionHeading>
        {name}
      </ActionPanelPrimitives.SectionHeading>
      <Fieldset>
        {isLoading ?
          Array.from({ length: 12 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: These will never change
            <SwatchSkeleton key={i} variant="rectangular" />
          ))
        : <>
            {colors.map((color) => (
              <InteractiveSwatch
                aria-selected={color === selectedColor}
                key={color.code}
                locked={isColorDisabled?.(color)}
                onClick={() => {
                  playSound();
                  setColor(color);
                }}
                paletteColor={color}
                role="option"
              />
            ))}
            {includeEyedropper && (
              <EyedropperSwatch
                aria-disabled={selectedPixelColorRgb === null}
                swatchColor={selectedPixelColorRgb}
                onClick={() => {
                  playSound();
                  setColor(selectedPixelColor);
                }}
              />
            )}
          </>
        }
      </Fieldset>
    </>
  );
}
