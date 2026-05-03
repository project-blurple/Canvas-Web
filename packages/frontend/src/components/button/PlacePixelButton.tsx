import type { Cooldown } from "@blurple-canvas-web/types";
import { styled } from "@mui/material";
import CircularProgress from "@mui/material/CircularProgress";
import axios from "axios";
import { useEffect, useState } from "react";
import config from "@/config/clientConfig";
import {
  useAuthContext,
  useCanvasContext,
  useCanvasViewContext,
  useSelectedColorContext,
} from "@/contexts";
import { usePlayCooldownExpirySound, usePlaySound } from "@/hooks";
import { Button } from "./Button";
import ButtonSupplement from "./ButtonSupplement";
import DynamicButton from "./DynamicButton";

const Time = styled("time")`
  font-variant-numeric: tabular-nums;
`;

interface PlacePixelButtonProps {
  isVerbose: boolean;
}

const durationFormat =
  "DurationFormat" in Intl ?
    new Intl.DurationFormat("en-US", { style: "narrow" })
  : undefined;

export default function PlacePixelButton({ isVerbose }: PlacePixelButtonProps) {
  const { canvas } = useCanvasContext();
  const { coords, adjustedCoords, setCoords } = useCanvasViewContext();
  const { color } = useSelectedColorContext();
  const playCooldownExpirySound = usePlayCooldownExpirySound();
  const playPixelPlacementSound = usePlaySound("place_pixel");
  const isSelected = adjustedCoords && color;
  const [timeLeft, setTimeLeft] = useState(0);
  const [isPlacing, setIsPlacing] = useState(false);
  const [previousTimeLeft, setPreviousTimeLeft] = useState(0);
  const { user, signOut } = useAuthContext();

  // cooldown timer
  useEffect(() => {
    if (timeLeft) {
      const timerId = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
      return () => clearTimeout(timerId);
    }
    setTimeLeft(0);
  }, [timeLeft]);

  useEffect(() => {
    if (previousTimeLeft > 0 && timeLeft === 0) {
      playCooldownExpirySound();
    }
    setPreviousTimeLeft(timeLeft);
  }, [playCooldownExpirySound, previousTimeLeft, timeLeft]);

  const handlePixelRequest = () => {
    if (!coords || !color) return;

    playPixelPlacementSound();

    const body = {
      x: coords.x,
      y: coords.y,
      colorId: color.id,
    };

    setIsPlacing(true);
    axios
      .post<Cooldown>(
        `${config.apiUrl}/api/v1/canvas/${encodeURIComponent(canvas.id)}/pixel`,
        body,
        { withCredentials: true },
      )
      .then((res) => res.data)
      .then((data) => {
        const cooldown = data.cooldownEndTime;
        if (cooldown) {
          setTimeLeft(Math.ceil(cooldown / 1000));
        }
        setIsPlacing(false);
      })
      .catch((e) => {
        console.error(e);
        // Should I include an alert?
        if (e.response?.status === 401) {
          signOut();
        }
        alert("Failed to place pixel, please refresh the page");
      });

    setCoords(null);
  };

  // Both these buttons never show as the logic is hoisted at the level above this
  // My issues with having it above is that the user has no indication of why they can't place pixels
  if (canvas.isLocked) {
    return <Button disabled>Canvas can’t be modified</Button>;
  }
  if (!user) {
    return <Button disabled>Sign in to place pixels</Button>;
  }

  if (isPlacing) {
    return (
      <Button variant="contained" disabled>
        Placing pixel
        <CircularProgress
          color="inherit"
          // Can't get sizing to work dynamically
          size="1.5rem"
          style={{ marginLeft: "1rem" }}
        />
      </Button>
    );
  }

  if (timeLeft > 0) {
    return (
      <Button variant="contained" disabled>
        On cooldown (
        <Time>
          {durationFormat?.format({ seconds: timeLeft }) ?? (
            <>{timeLeft}&nbsp;s</>
          )}
        </Time>
        )
      </Button>
    );
  }

  // Temporary fix to show disabled button because I
  // did not make the dynamic button component
  if (!color && !adjustedCoords) {
    return <Button disabled>Select a pixel and color</Button>;
  }
  if (!color) {
    return <Button disabled>Select a color</Button>;
  }
  if (!adjustedCoords) {
    return <Button disabled>Select a pixel</Button>;
  }

  const { x, y } = adjustedCoords;
  const nbsp = "\u00A0";

  const placePixelMessage =
    isVerbose ? `Place ${color.code} at` : "Place pixel";

  return (
    <DynamicButton color={color.rgba} onAction={handlePixelRequest}>
      {isSelected ? placePixelMessage : "Select a pixel"}
      {isSelected && (
        <ButtonSupplement>
          {/* String interpolation is required to prevent https://github.com/project-blurple/Canvas-Web/issues/255 */}
          {`(${x},${nbsp}${y})`}
        </ButtonSupplement>
      )}
    </DynamicButton>
  );
}
