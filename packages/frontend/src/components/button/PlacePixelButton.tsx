import { Cooldown } from "@blurple-canvas-web/types";
import { CircularProgress, styled } from "@mui/material";
import axios from "axios";
import { useCallback, useEffect, useState } from "react";

import config from "@/config";
import {
  useAudioContext,
  useAuthContext,
  useCanvasContext,
  useCanvasViewContext,
  useSelectedColorContext,
} from "@/contexts";
import { Button } from "./Button";
import DynamicButton from "./DynamicButton";

export const CoordinateLabel = styled("span")`
  margin-inline-start: 0.25em;
  opacity: 0.6;
`;

interface PlacePixelButtonProps {
  isVerbose: boolean;
}

export default function PlacePixelButton({ isVerbose }: PlacePixelButtonProps) {
  const { canvas } = useCanvasContext();
  const { coords, adjustedCoords, setCoords } = useCanvasViewContext();
  const { color } = useSelectedColorContext();
  const { playSounds, cooldownExpiryJingle } = useAudioContext();
  const isSelected = adjustedCoords && color;
  const [timeLeft, setTimeLeft] = useState(0);
  const [isPlacing, setIsPlacing] = useState(false);
  const [previousTimeLeft, setPreviousTimeLeft] = useState(0);
  const { user, signOut } = useAuthContext();

  const handleCooldownExpired = useCallback(() => {
    if (!cooldownExpiryJingle) {
      return;
    }

    void new Audio("/audio/cooldown_notification.ogg").play().catch(() => {
      // Ignore playback failures from browser autoplay rules.
    });
  }, [cooldownExpiryJingle]);

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
      handleCooldownExpired();
    }
    setPreviousTimeLeft(timeLeft);
  }, [previousTimeLeft, timeLeft, handleCooldownExpired]);

  const handlePixelRequest = () => {
    if (!coords || !color) return;

    if (playSounds) {
      void new Audio("/audio/place_pixel.ogg").play().catch(() => {
        // Ignore playback failures from browser autoplay rules.
      });
    }

    const requestUrl = `${config.apiUrl}/api/v1/canvas/${canvas.id}/pixel`;

    const body = {
      x: coords.x,
      y: coords.y,
      colorId: color.id,
    };

    setIsPlacing(true);
    axios
      .post<Cooldown>(requestUrl, body, {
        withCredentials: true,
      })
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
        On cooldown: {timeLeft} seconds left
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

  const placePixelMessege =
    isVerbose ? `Place ${color.code} at` : "Place pixel";

  return (
    <DynamicButton color={color} onAction={handlePixelRequest}>
      {isSelected ? placePixelMessege : "Select a pixel"}
      {isSelected && (
        <CoordinateLabel>
          {/* String interpolation is required to prevent https://github.com/project-blurple/Canvas-Web/issues/255 */}
          {`(${x},${nbsp}${y})`}
        </CoordinateLabel>
      )}
    </DynamicButton>
  );
}
