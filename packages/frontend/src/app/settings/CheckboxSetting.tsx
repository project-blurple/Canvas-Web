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

const VolumeSliderWrapper = styled("div")`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding-block-start: 0.5rem;
`;

const VolumeSlider = styled("input")`
  inline-size: 100%;
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

interface VolumeSettingProps extends Omit<
  React.ComponentPropsWithRef<typeof CheckboxSetting>,
  "onChange" | "onVolumeChange"
> {
  volume?: number;
  onVolumeChange?: React.ChangeEventHandler<HTMLInputElement>;
  onCheckedChange?: React.ChangeEventHandler<HTMLInputElement>;
  onVolumePreview?: () => void;
  previewAudioRef?: React.RefObject<HTMLAudioElement | null>;
}

export function VolumeSetting({
  volume = 75,
  onVolumeChange,
  onCheckedChange,
  onVolumePreview,
  previewAudioRef,
  ...props
}: VolumeSettingProps) {
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

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
      <VolumeSliderWrapper>
        <Volume1 />
        <VolumeSlider
          aria-label="Volume"
          disabled={
            props["aria-busy"] === true ||
            props["aria-busy"] === "true" ||
            !props.checked
          }
          list="ticks"
          max={100}
          min={0}
          onChange={handleVolumeChange}
          step={10}
          type="range"
          value={volume}
        />
        <Volume2 />
        <datalist id="ticks">
          {Array.from({ length: 11 }, (_, i) => i * 10).map((value) => (
            <option key={value} value={value} />
          ))}
        </datalist>
      </VolumeSliderWrapper>
    </CheckboxSetting>
  );
}
