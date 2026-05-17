"use client";

import type { Palette } from "@blurple-canvas-web/types";
import { Autocomplete, Chip, css, styled, TextField } from "@mui/material";
import { SquareMinus, SquarePlus } from "lucide-react";
import type * as React from "react";
import DynamicButton from "@/components/button/DynamicButton";
import { useCanvasContext } from "@/contexts";
import { usePalette } from "@/hooks";
import type { SearchFilterMode } from "./ComplexSearchTab";

const SelectedColorChips = styled("div")`
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
`;

export const ColorSelectChip = styled(Chip, {
  shouldForwardProp: (prop) => prop !== "backgroundColorStr",
})<{ backgroundColorStr?: string }>`
  --color-select-chip-color: var(--discord-blurple);
  ${({ backgroundColorStr }) =>
    backgroundColorStr &&
    css`
      --color-select-chip-color: ${backgroundColorStr};
    `}

  background-color: var(--color-select-chip-color);
  font-weight: 600;

  & .MuiChip-label {
    color: var(--color-select-chip-color);
    transition:
      color var(--transition-duration-fast) ease,
      filter var(--transition-duration-fast) ease;
  }

  @supports (color: color-mix(in oklab, black, black)) {
    & .MuiChip-label {
      color: color-mix(
        in oklab,
        contrast-color(var(--color-select-chip-color)) 94%,
        var(--color-select-chip-color)
      );
    }
  }

  @supports not (color: color-mix(in oklab, black, black)) {
    & .MuiChip-label {
      filter: invert(1) grayscale(1) brightness(1.3) contrast(9000);
      mix-blend-mode: luminosity;
    }
  }
`;

const ColorSelectBlock = styled("div")`
  display: flex;
  flex-direction: row;
  gap: 0.5rem;
  align-items: center;
`;

const ToggleFilterModeButton = styled(DynamicButton)`
  min-width: auto;
`;

interface ComplexSearchColorSelectProps {
  value: number[];
  filterMode: SearchFilterMode;
  onChange: (value: number[]) => void;
  onFilterModeChange: (mode: SearchFilterMode) => void;
  disabled: boolean;
}

export default function ComplexSearchColorSelect({
  value,
  filterMode,
  onChange,
  onFilterModeChange,
  disabled,
}: ComplexSearchColorSelectProps) {
  const { canvas } = useCanvasContext();
  const { data: palette = [] } = usePalette(canvas.eventId ?? undefined);

  const sortedPalette = palette.toSorted((a, b) =>
    a.global === b.global ? 0
    : a.global ? -1
    : 1,
  ); // Ensure palette is sorted for consistent option order
  const paletteById = Object.fromEntries(
    sortedPalette.map((color) => [color.id, color]),
  );

  function handleColorChange(
    _event: React.SyntheticEvent,
    newValues: Palette[number][],
  ) {
    onChange(newValues.map((c) => c.id));
  }

  // map selected ids to palette objects (may be undefined for stale ids)
  const selectedOptions = value
    .map((id) => paletteById[id])
    .filter((c): c is Palette[number] => c !== undefined);

  const label = `Colors to ${filterMode}`;

  return (
    <ColorSelectBlock>
      <ToggleFilterModeButton
        onAction={() => {
          onFilterModeChange(filterMode === "include" ? "exclude" : "include");
        }}
        disabled={disabled}
        role="spinbutton"
      >
        {filterMode === "include" ?
          <SquarePlus />
        : <SquareMinus />}
      </ToggleFilterModeButton>

      <Autocomplete
        autoHighlight
        disabled={disabled}
        fullWidth
        getOptionLabel={(option) => `${option.name} (${option.code})`}
        multiple
        onChange={handleColorChange}
        options={sortedPalette}
        size="small"
        value={selectedOptions}
        filterOptions={(options, { inputValue }) => {
          const q = inputValue.trim().toLowerCase();
          if (!q) return options;
          return options.filter(
            (opt) =>
              opt.name.toLowerCase().includes(q) ||
              opt.code.toLowerCase().includes(q),
          );
        }}
        groupBy={(option) =>
          option.global ? "Global colors" : "Partner colors"
        }
        renderInput={(params) => <TextField {...params} label={label} />}
        renderOption={(props, option) => {
          const { key, ...liProps } = props;

          return (
            <li key={key ?? option.id} {...liProps}>
              {option.name} ({option.code})
            </li>
          );
        }}
        isOptionEqualToValue={(option, value) =>
          option.id === (value as Palette[number]).id
        }
        renderValue={(
          values: Palette[number][],
          getItemProps: (args: { index: number }) => Record<string, unknown>,
        ) => (
          <SelectedColorChips>
            {values.map((tag, index) => {
              const rgb = tag.rgba.slice(0, 3).join(" ");
              const itemProps = getItemProps({ index });
              const { key: _key, ...restProps } = itemProps;
              return (
                <ColorSelectChip
                  key={tag.id}
                  {...restProps}
                  backgroundColorStr={`rgb(${rgb})`}
                  label={tag.name}
                  size="small"
                />
              );
            })}
          </SelectedColorChips>
        )}
      />
    </ColorSelectBlock>
  );
}
