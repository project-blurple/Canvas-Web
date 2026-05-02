"use client";

import type { Palette } from "@blurple-canvas-web/types";
import {
  Chip,
  FormControl,
  InputLabel,
  ListSubheader,
  MenuItem,
  OutlinedInput,
  Select,
  type SelectChangeEvent,
  styled,
} from "@mui/material";
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

function partitionPalette(palette: Palette) {
  const mainColors: Palette = [];
  const partnerColors: Palette = [];

  for (const color of palette) {
    (color.global ? mainColors : partnerColors).push(color);
  }

  return [mainColors, partnerColors];
}

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
  const [mainColors, partnerColors] = partitionPalette(palette);
  const paletteById = Object.fromEntries(
    palette.map((color) => [color.id, color]),
  );

  function handleColorChange(event: SelectChangeEvent<string[]>) {
    const nextValue = event.target.value;
    onChange(typeof nextValue === "string" ? nextValue.split(",") : nextValue);
  }

  function renderSelectedColorChips(selectedIds: string[]) {
    return (
      <SelectedColorChips>
        {selectedIds.map((colorId) => {
          const color = paletteById[Number(colorId)];
          if (!color) return null;

          const rgb = color.rgba.slice(0, 3).join(" ");
          return (
            <ColorSelectChip
              key={color.id}
              backgroundColorStr={`rgb(${rgb})`}
              label={color.code}
              size="small"
            />
          );
        })}
      </SelectedColorChips>
    );
  }

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
      <FormControl fullWidth size="small">
        <InputLabel>{label}</InputLabel>
        <Select<string[]>
          multiple
          value={value}
          onChange={handleColorChange}
          input={<OutlinedInput label={label} />}
          renderValue={renderSelectedColorChips}
        >
          <ListSubheader>Global colors</ListSubheader>
          {mainColors.map((color) => (
            <MenuItem key={color.id} value={String(color.id)}>
              {color.name} ({color.code})
            </MenuItem>
          ))}
          <ListSubheader>Partner colors</ListSubheader>
          {partnerColors.map((color) => (
            <MenuItem key={color.id} value={String(color.id)}>
              {color.name} ({color.code})
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </ColorSelectBlock>
  );
}
