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
      "checked" | "name" | "onChange"
    > {
  description: React.ReactNode;
  label: React.ReactNode;
}

export default function CheckboxSetting({
  checked,
  description,
  label,
  name,
  onChange,
  ...props
}: CheckboxSettingProps) {
  const id = useId();
  return (
    <Wrapper {...props}>
      <input
        checked={checked}
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
