import { styled } from "@mui/material";
import CircularProgress from "@mui/material/CircularProgress";
import VisuallyHidden from "@/components/VisuallyHidden";
import {
  useAuthContext,
  useCanvasContext,
  useCanvasViewContext,
  useSelectedColorContext,
} from "@/contexts";
import ButtonSupplement from "../../../button/ButtonSupplement";
import DynamicButton from "../../../button/DynamicButton";

const Time = styled("time")`
  font-variant-numeric: tabular-nums;
`;

interface PlacePixelButtonProps extends React.ComponentPropsWithRef<
  typeof DynamicButton
> {
  cooldownSeconds?: number;
  busy?: boolean;
  isVerbose: boolean;
}

const durationFormat =
  "DurationFormat" in Intl ?
    new Intl.DurationFormat("en-US", { style: "narrow" })
  : undefined;

export default function PlacePixelButton({
  "aria-busy": busy,
  cooldownSeconds = 0,
  isVerbose,
  ...props
}: PlacePixelButtonProps) {
  const { user } = useAuthContext();
  const { canvas } = useCanvasContext();
  const { adjustedCoords } = useCanvasViewContext();
  const { color } = useSelectedColorContext();
  const isSelected = adjustedCoords && color;

  // Both these buttons never show as the logic is hoisted at the level above this
  // My issues with having it above is that the user has no indication of why they can't place pixels
  if (canvas.isLocked)
    return (
      <DynamicButton {...props} disabled>
        Canvas can’t be modified
      </DynamicButton>
    );

  if (!user)
    return (
      <DynamicButton {...props} disabled>
        Sign in to place pixels
      </DynamicButton>
    );

  if (busy)
    return (
      <DynamicButton
        {...props}
        aria-busy
        endIcon={<CircularProgress color="inherit" size="1em" />}
        disabled
      >
        Placing pixel…
      </DynamicButton>
    );

  if (cooldownSeconds > 0) {
    const formattedTime = durationFormat?.format({
      seconds: cooldownSeconds,
    }) ?? <>{cooldownSeconds.toLocaleString()}&nbsp;s</>;
    return (
      <DynamicButton {...props} disabled>
        On cooldown
        <ButtonSupplement>
          (<Time aria-hidden>{formattedTime}</Time>
          <VisuallyHidden>{cooldownSeconds} seconds</VisuallyHidden>)
        </ButtonSupplement>
      </DynamicButton>
    );
  }

  if (!color && !adjustedCoords)
    return (
      <DynamicButton {...props} disabled>
        Select pixel & color
      </DynamicButton>
    );

  if (!color)
    return (
      <DynamicButton {...props} disabled>
        Select a color
      </DynamicButton>
    );

  if (!adjustedCoords)
    return (
      <DynamicButton {...props} disabled>
        Select a pixel
      </DynamicButton>
    );

  return (
    <DynamicButton color={color?.rgba} {...props}>
      {isVerbose ?
        <>
          Place <code>{color.code}</code> at
        </>
      : "Place pixel"}
      {isSelected && (
        <ButtonSupplement>
          {/* String interpolation is required to prevent https://github.com/project-blurple/Canvas-Web/issues/255 */}
          {`(${adjustedCoords.x},\u{00A0}${adjustedCoords.y})`}
        </ButtonSupplement>
      )}
    </DynamicButton>
  );
}
