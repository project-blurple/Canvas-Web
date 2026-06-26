import { styled } from "@mui/material";
import { Volume, Volume1, Volume2, VolumeX } from "lucide-react";
import { useId } from "react";

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

const VolumeLabel = styled("span")`
  font-variant-numeric: tabular-nums;
  min-inline-size: 5ch;
  text-align: right;
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
}

export function VolumeSetting({
  volume = 75,
  onVolumeChange,
  onCheckedChange,
  ...props
}: VolumeSettingProps) {
  const volumeIcon =
    props.checked === false ? <VolumeX />
    : volume <= 33 ? <Volume />
    : volume <= 66 ? <Volume1 />
    : <Volume2 />;

  return (
    <CheckboxSetting onChange={onCheckedChange} {...props}>
      <VolumeSliderWrapper>
        {volumeIcon}
        <VolumeSlider
          aria-label="Volume"
          disabled={
            props["aria-busy"] === true ||
            props["aria-busy"] === "true" ||
            !props.checked
          }
          max={100}
          min={0}
          onChange={onVolumeChange}
          step={1}
          type="range"
          value={volume}
        />
        <VolumeLabel>{volume}%</VolumeLabel>
      </VolumeSliderWrapper>
    </CheckboxSetting>
  );
}
