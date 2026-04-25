import { styled } from "@mui/material";
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
  &[aria-disabled="true"] :not(input[type="checkbox"]) {
    opacity: 55%;
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

interface CheckboxSettingProps
  extends
    Omit<React.ComponentPropsWithRef<typeof Wrapper>, "onChange">,
    Pick<
      React.DetailedHTMLProps<
        React.InputHTMLAttributes<HTMLInputElement>,
        HTMLInputElement
      >,
      "checked" | "disabled" | "name" | "onChange"
    > {
  description?: React.ReactNode;
  label: React.ReactNode;
}

export default function CheckboxSetting({
  "aria-busy": ariaBusy,
  checked,
  description,
  disabled,
  label,
  name,
  onChange,
  ...props
}: CheckboxSettingProps) {
  const id = useId();
  return (
    <Wrapper {...props} aria-disabled={disabled}>
      <input
        aria-busy={ariaBusy}
        checked={checked ?? false}
        disabled={disabled || ariaBusy === true || ariaBusy === "true"}
        id={id}
        name={name}
        onChange={onChange}
        type="checkbox"
      />
      <Label htmlFor={id}>{label}</Label>
      {description && <Description>{description}</Description>}
    </Wrapper>
  );
}
