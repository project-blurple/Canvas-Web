import { styled } from "@mui/material";
import { Volume1, Volume2 } from "lucide-react";
import { useEffect, useId, useRef } from "react";

const VOLUME_PREVIEW_DEBOUNCE_MS = 300;

const Wrapper = styled("div")`
  align-items: baseline;
  column-gap: 16px;
  display: grid;
  grid-template-columns: auto 1fr;
  letter-spacing: 0.01em;
  padding: var(--card-border-radius);
  & + & {
    border-block-start: var(--card-border);
  }
  &:first-of-type {
    border-start-start-radius: inherit;
    border-start-end-radius: inherit;
  }
  &:last-of-type {
    border-end-start-radius: inherit;
    border-end-end-radius: inherit;
  }
  > :not(input[type="checkbox"]) {
    grid-column: 2;
  }
`;

const Label = styled("label")`
  font-weight: 600;
`;

const Description = styled("p")`
  color: oklch(from var(--discord-white) l c h / 55%);
  margin-block-start: 0.5em;
`;

const VolumeControlWrapper = styled("div")`
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding-block-start: 0.5rem;
`;

const VolumeSliderWrapper = styled("div")`
  display: flex;
  flex-direction: column;
  inline-size: 80%;
`;

const VolumeSlider = styled("input")`
  inline-size: 100%;
`;

const TickLabels = styled("div")`
  color: oklch(from var(--discord-white) l c h / 55%);
  display: flex;
  font-size: 0.75rem;
  justify-content: space-between;
  margin-block-start: 0.25rem;
  text-align: center;

  > span {
    min-inline-size: 2.5ch;
  }
`;

interface CheckboxSettingProps
  extends
    Omit<React.ComponentPropsWithRef<typeof Wrapper>, "onChange">,
    Pick<
      React.DetailedHTMLProps<
        React.InputHTMLAttributes<HTMLInputElement>,
        HTMLInputElement
      >,
      "checked" | "name" | "onChange"
    > {
  description?: React.ReactNode;
  label: React.ReactNode;
}

export default function CheckboxSetting({
  "aria-busy": ariaBusy,
  checked,
  description,
  label,
  name,
  onChange,
  children,
  ...props
}: CheckboxSettingProps) {
  const id = useId();
  return (
    <Wrapper {...props}>
      <input
        aria-busy={ariaBusy}
        checked={checked ?? false}
        disabled={ariaBusy === true || ariaBusy === "true"}
        id={id}
        name={name}
        onChange={onChange}
        type="checkbox"
      />
      <Label htmlFor={id}>{label}</Label>
      {description && <Description>{description}</Description>}
      {children}
    </Wrapper>
  );
}

interface VolumeControlSettingProps extends Omit<
  React.ComponentPropsWithRef<typeof CheckboxSetting>,
  "onChange" | "onVolumeChange"
> {
  volume?: number;
  onVolumeChange?: React.ChangeEventHandler<HTMLInputElement>;
  onCheckedChange?: React.ChangeEventHandler<HTMLInputElement>;
  onVolumePreview?: () => void;
  previewAudioRef?: React.RefObject<HTMLAudioElement | null>;
}

export function VolumeControlSetting({
  volume = 70,
  onVolumeChange,
  onCheckedChange,
  onVolumePreview,
  previewAudioRef,
  ...props
}: VolumeControlSettingProps) {
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const ticksLabelId = useId();

  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  const handleVolumeChange: React.ChangeEventHandler<HTMLInputElement> = (
    e,
  ) => {
    onVolumeChange?.(e);

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      // Stop any currently playing preview
      if (previewAudioRef?.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current.currentTime = 0;
      }

      onVolumePreview?.();
    }, VOLUME_PREVIEW_DEBOUNCE_MS);
  };

  return (
    <CheckboxSetting onChange={onCheckedChange} {...props}>
      <VolumeControlWrapper>
        <Volume1 />
        <VolumeSliderWrapper>
          <VolumeSlider
            aria-label="Volume"
            disabled={
              props["aria-busy"] === true ||
              props["aria-busy"] === "true" ||
              !props.checked
            }
            list={ticksLabelId}
            max={100}
            min={0}
            onChange={handleVolumeChange}
            step={10}
            type="range"
            value={volume}
          />
          <TickLabels>
            <span>0</span>
            <span>50</span>
            <span>100</span>
          </TickLabels>
        </VolumeSliderWrapper>
        <Volume2 />

        <datalist id={ticksLabelId}>
          {Array.from({ length: 11 }, (_, i) => i * 10).map((value) => (
            <option key={value} value={value} />
          ))}
        </datalist>
      </VolumeControlWrapper>
    </CheckboxSetting>
  );
}
