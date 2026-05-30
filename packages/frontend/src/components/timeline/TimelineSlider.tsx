import { css, styled } from "@mui/material";
import {
  Clock1,
  Clock2,
  Clock3,
  Clock4,
  Clock5,
  Clock6,
  Clock7,
  Clock8,
  Clock9,
  Clock10,
  Clock11,
  Clock12,
  GripVertical,
} from "lucide-react";
import { useCanvasContext, useTimelineContext } from "@/contexts";
import { useSnapshots } from "@/hooks/queries/useSnapshots";

const TimelineSliderWrapper = styled("div")`
  align-items: center;
  background-color: oklch(
    from var(--discord-legacy-dark-but-not-black) l c h / 80%
  );
  border-radius: 0.5rem 0.5rem 1rem 1rem;
  border: oklch(from var(--discord-white) l c h / 12%) 3px solid;
  box-shadow: 0 0 10px rgba(0 0 0 / 25%);
  display: flex;
  flex-direction: row;
  gap: 0.5rem;
  inset-block-end: 0.5rem;
  inset-inline-end: 0.5rem;
  justify-content: center;
  padding-inline: 1rem;
  position: absolute;
  width: calc(100% - 1rem);
  z-index: 1;
`;

const timelineSliderTrackStyles = css`
  background-color: var(--discord-legacy-not-quite-black);
  border-radius: 0.5rem;
  height: 0.5rem;
`;

const timelineSliderThumbStyles = css`
  width: 0;
  height: 0;
  border: none;
  background: transparent;
`;

const TimelineSliderInputWrapper = styled("div")`
  align-items: center;
  display: flex;
  justify-content: center;
  margin-inline: 1rem;
  padding-block: 0.5rem;
  position: relative;
  width: 100%;
`;

const TimelineSliderInput = styled("input")`
  // remove default styles
  -webkit-appearance: none;
  appearance: none;
  background: transparent;
  outline: none;

  width: 100%;
  padding-block: 0.5rem;

  &::-webkit-slider-runnable-track {
    ${timelineSliderTrackStyles}
  }

  &::-moz-range-track {
    ${timelineSliderTrackStyles}
  }

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    ${timelineSliderThumbStyles}
  }

  &::-moz-range-thumb {
    ${timelineSliderThumbStyles}
  }
`;

const TimelineSliderThumb = styled("div")`
  align-items: center;
  background-color: var(--discord-blurple);
  border-radius: 0.25rem;
  border: 2px solid oklch(from var(--discord-white) l c h / 20%);
  box-shadow: 0 0 10px rgba(0 0 0 / 35%);
  cursor: grabbing;
  display: flex;
  height: 2rem;
  justify-content: center;
  left: 0;
  pointer-events: none;
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 1.5rem;

  & > svg {
    color: oklch(from var(--discord-white) l c h / 55%);
  }
`;

const DateTimeWrapper = styled("div")`
  display: flex;
  flex-direction: row;
  gap: 1rem;
  width: fit-content;
`;

const DateTimeTextWrapper = styled("div")`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  justify-content: center;
  text-align: center;
  width: 5rem;
`;

const DateText = styled("span")`
  font-size: 0.75rem;
`;

const TimeText = styled("span")`
  font-size: 0.875rem;
`;

function ClockIconSyncedToTime({ hour }: { hour: number }) {
  const normalizedHour = ((hour - 1) % 12) + 1;

  switch (normalizedHour) {
    case 1:
      return <Clock1 />;
    case 2:
      return <Clock2 />;
    case 3:
      return <Clock3 />;
    case 4:
      return <Clock4 />;
    case 5:
      return <Clock5 />;
    case 6:
      return <Clock6 />;
    case 7:
      return <Clock7 />;
    case 8:
      return <Clock8 />;
    case 9:
      return <Clock9 />;
    case 10:
      return <Clock10 />;
    case 11:
      return <Clock11 />;
    case 12:
      return <Clock12 />;
  }
}

export default function TimelineSlider() {
  const {
    currentTimelineFrame,
    handleTimelineSlider,
    timelineSliderThumbPosition,
    totalTimelineFrames,
  } = useTimelineContext();
  const { canvas } = useCanvasContext();
  const { data: snapshots } = useSnapshots(canvas.id);

  const currentSnapshot =
    snapshots?.[Math.min(currentTimelineFrame, totalTimelineFrames - 1)];

  const currentDatetime =
    currentSnapshot ? new Date(currentSnapshot.snapshotAt) : null;
  const currentDate =
    currentDatetime ?
      currentDatetime.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "";
  const currentTime =
    currentDatetime ?
      currentDatetime.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      })
    : "";

  return (
    <TimelineSliderWrapper onPointerDown={(event) => event.stopPropagation()}>
      {currentSnapshot && (
        <DateTimeWrapper>
          <ClockIconSyncedToTime
            hour={(currentDatetime?.getHours() ?? 0) % 12 || 12}
          />
          <DateTimeTextWrapper>
            <TimeText>{currentTime}</TimeText>
            <DateText>{currentDate}</DateText>
          </DateTimeTextWrapper>
        </DateTimeWrapper>
      )}
      <TimelineSliderInputWrapper>
        <TimelineSliderInput
          type="range"
          min="0"
          max={totalTimelineFrames}
          value={currentTimelineFrame}
          onChange={handleTimelineSlider}
        />
        <TimelineSliderThumb
          style={{ left: `${timelineSliderThumbPosition}%` }}
        >
          <GripVertical />
        </TimelineSliderThumb>
      </TimelineSliderInputWrapper>
    </TimelineSliderWrapper>
  );
}
