"use client";

import * as React from "react";
import type { Palette } from "@blurple-canvas-web/types";
import { Chip, Autocomplete, TextField, styled } from "@mui/material";
import { SearchFilterMode } from "./ComplexSearchTab";
import DynamicButton from "@/components/button/DynamicButton";
import { SquareMinus, SquarePlus } from "lucide-react";

const SelectedColorChips = styled("div")`
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
`;

const ColorSelectChip = styled(Chip, {
  shouldForwardProp: (prop) => prop !== "backgroundColorStr",
})<{ backgroundColorStr?: string }>`
  background-color: ${({ backgroundColorStr }) =>
    backgroundColorStr ?? "var(--discord-blurple)"};
  font-weight: 600;

  & .MuiChip-label {
    color: ${({ backgroundColorStr }) =>
      backgroundColorStr ?? "var(--discord-blurple)"};
    transition:
      color var(--transition-duration-fast) ease,
      filter var(--transition-duration-fast) ease;
  }

  @supports (color: color-mix(in oklab, black, black)) {
    & .MuiChip-label {
      color: color-mix(
        in oklab,
        contrast-color(
            ${({ backgroundColorStr }) =>
              backgroundColorStr ?? "var(--discord-blurple)"}
          )
          94%,
        ${({ backgroundColorStr }) =>
          backgroundColorStr ?? "var(--discord-blurple)"}
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
  palette: Palette;
  value: string[];
  filterMode: SearchFilterMode;
  onChange: (value: string[]) => void;
  onFilterModeChange: (mode: SearchFilterMode) => void;
}

export default function ComplexSearchColorSelect({
  palette,
  value,
  filterMode,
  onChange,
  onFilterModeChange,
}: ComplexSearchColorSelectProps) {
  palette.sort((a, b) =>
    a.global === b.global ? 0
    : a.global ? -1
    : 1,
  ); // Ensure palette is sorted for consistent option order
  const paletteById = Object.fromEntries(
    palette.map((color) => [color.id, color]),
  );

  function handleColorChange(
    _event: React.SyntheticEvent,
    newValues: Palette[number][],
  ) {
    onChange(newValues.map((c) => String(c.id)));
  }

  // map selected ids to palette objects (may be undefined for stale ids)
  const selectedOptions = value
    .map((id) => paletteById[Number(id)])
    .filter((c): c is Palette[number] => !!c);

  const label = `Colors to ${filterMode}`;

  return (
    <ColorSelectBlock>
      <ToggleFilterModeButton
        onAction={() => {
          onFilterModeChange(filterMode === "include" ? "exclude" : "include");
        }}
      >
        {filterMode === "include" ?
          <SquarePlus />
        : <SquareMinus />}
      </ToggleFilterModeButton>

      <Autocomplete
        fullWidth
        size="small"
        multiple
        autoHighlight
        filterOptions={(options, { inputValue }) => {
          const q = inputValue.trim().toLowerCase();
          if (!q) return options;
          return options.filter((opt) =>
            opt.name.toLowerCase().includes(q) || opt.code.toLowerCase().includes(q),
          );
        }}
        options={palette}
        value={selectedOptions}
        onChange={handleColorChange}
        groupBy={(option) =>
          option.global ? "Global colors" : "Partner colors"
        }
        getOptionLabel={(option) => `${option.name} (${option.code})`}
        renderInput={(params) => <TextField {...params} label={label} />}
        renderOption={(props, option) => (
          <li {...props} key={option.id}>
            {option.name} ({option.code})
          </li>
        )}
        isOptionEqualToValue={(option, value) =>
          option.id === (value as Palette[number]).id
        }
        renderValue={(
          values: Palette[number][],
          getItemProps: (args: { index: number }) => any,
        ) => (
          <SelectedColorChips>
            {values.map((tag, index) => {
              const rgb = tag.rgba.slice(0, 3).join(" ");
              return (
                <ColorSelectChip
                  key={tag.id}
                  {...getItemProps({ index })}
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
