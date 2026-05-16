// Custom number field built with a native <input type="number">.

import { styled } from "@mui/material/styles";
import { ChevronDown, ChevronUp } from "lucide-react";
import React from "react";
import { clamp } from "@/util";

type NumberFieldValue = number | null;

type NumberFieldProps = {
  label?: React.ReactNode;
  size?: "small" | "medium";
  value?: NumberFieldValue;
  min?: number;
  max?: number;
  disabled?: boolean;
  onValueChange?: (value: NumberFieldValue) => void;
};

const Root = styled("div")`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`;

const Label = styled("label")`
  color: ${({ theme }) => theme.palette.text.secondary};
  font-size: 0.875rem;
  line-height: 1.4375;
`;

const FieldRow = styled("div")<{ $size: "small" | "medium" }>(
  ({ $size, theme }) => `
    align-items: stretch;
    background: var(--discord-legacy-not-quite-black);
    border: var(--card-border);
    border-radius: 0.5rem;
    display: flex;
    gap: 0;
    min-height: ${$size === "small" ? "2.25rem" : "3.5rem"};
    overflow: hidden;
    transition: ${theme.transitions.create(["border-color", "box-shadow"], {
      duration: theme.transitions.duration.shorter,
    })};

    &:focus-within {
      border-color: var(--discord-blurple);
      box-shadow: 0 0 0 1px var(--discord-blurple);
    }
  `,
);

const NativeInput = styled("input", {
  shouldForwardProp: (prop) => prop !== "$size",
})<{ $size: "small" | "medium" }>`
  appearance: textfield;
  background: transparent;
  border: 0;
  color: inherit;
  flex: 1;
  font: inherit;
  min-width: 0;
  outline: 0;
  padding: ${({ $size }) =>
    $size === "small" ? "0.375rem 0.75rem" : "0.875rem 1rem"};

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    appearance: none;
    margin: 0;
  }
`;

const StepperColumn = styled("div")`
  background: ${({ theme }) => theme.palette.action.hover};
  border-left: var(--card-border);
  display: flex;
  flex-direction: column;
`;

const StepperButton = styled("button")`
  background: transparent;
  border: 0;
  color: inherit;
  cursor: pointer;
  display: grid;
  flex: 1;
  min-width: 2rem;
  place-items: center;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.palette.action.selected};
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
`;

export default function NumberField({
  label,
  size = "medium",
  value,
  min,
  max,
  disabled,
  onValueChange,
}: NumberFieldProps) {
  const inputId = React.useId();

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const nextValue =
      event.target.value === "" ?
        null
      : Number.parseInt(event.target.value, 10);

    onValueChange?.(Number.isNaN(nextValue) ? null : nextValue);
  }

  function changeByStep(direction: 1 | -1) {
    const baseValue = value ?? 0;
    const nextValue =
      min != null || max != null ?
        clamp(baseValue + direction, min ?? -Infinity, max ?? Infinity)
      : baseValue + direction;

    onValueChange?.(nextValue);
  }

  function handleBlur() {
    if (value === null || value === undefined) return;
    const clampedValue =
      min != null || max != null ?
        clamp(value, min ?? -Infinity, max ?? Infinity)
      : value;

    if (clampedValue !== value) {
      onValueChange?.(clampedValue);
    }
  }

  return (
    <Root>
      {label && <Label htmlFor={inputId}>{label}</Label>}
      <FieldRow $size={size}>
        <NativeInput
          id={inputId}
          type="number"
          $size={size}
          value={value ?? ""}
          onChange={handleInputChange}
          onBlur={handleBlur}
          disabled={disabled}
          min={min}
          max={max}
          step={1}
        />
        <StepperColumn>
          <StepperButton
            type="button"
            aria-label="Increase"
            onClick={() => changeByStep(1)}
            disabled={disabled}
          >
            <ChevronUp size={size === "small" ? 14 : 16} />
          </StepperButton>
          <StepperButton
            type="button"
            aria-label="Decrease"
            onClick={() => changeByStep(-1)}
            disabled={disabled}
          >
            <ChevronDown size={size === "small" ? 14 : 16} />
          </StepperButton>
        </StepperColumn>
      </FieldRow>
    </Root>
  );
}
