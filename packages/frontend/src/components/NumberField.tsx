import { styled } from "@mui/material/styles";
import type React from "react";
import { useId } from "react";
import { clamp } from "@/util";

const Label = styled("label")`
  color: ${({ theme }) => theme.palette.text.secondary};
  display: block;
  font-size: 0.875rem;
  line-height: 1.5;
  margin-block-end: 0.5em;
`;

const Input = styled("input")`
  inline-size: 8ch;
  padding-block: 6px;
  padding-inline: 8px;
`;

interface NumberFieldProps extends Omit<
  React.ComponentPropsWithRef<typeof Input>,
  "value"
> {
  // Overrides
  max?: number;
  min?: number;
  value: number | null | undefined;
  // Extensions
  label?: React.ReactNode;
  labelProps?: React.ComponentPropsWithRef<typeof Label>;
  onValueChange?: (value: number | null) => void;
}

export default function NumberField({
  className,
  id,
  label,
  labelProps,
  max,
  min,
  onValueChange,
  value,
  ...props
}: NumberFieldProps) {
  const _id = useId();
  const resolvedId = id ?? _id;

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const nextValue =
      event.target.value === "" ?
        null
      : Number.parseInt(event.target.value, 10);

    onValueChange?.(Number.isNaN(nextValue) ? null : nextValue);
  }

  function handleBlur() {
    if (value === null || value === undefined) return;
    const clampedValue =
      min != null || max != null ?
        clamp(
          value,
          min ?? Number.NEGATIVE_INFINITY,
          max ?? Number.POSITIVE_INFINITY,
        )
      : value;

    if (clampedValue !== value) {
      onValueChange?.(clampedValue);
    }
  }

  return (
    <div className={className}>
      {label && <Label htmlFor={resolvedId}>{label}</Label>}
      <Input
        id={resolvedId}
        max={max}
        min={min}
        onBlur={handleBlur}
        onChange={handleInputChange}
        type="number"
        value={value ?? ""}
        {...props}
      />
    </div>
  );
}
