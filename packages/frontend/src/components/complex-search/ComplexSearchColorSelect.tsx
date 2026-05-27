"use client";

import type { Palette } from "@blurple-canvas-web/types";
import { Autocomplete, Chip, styled, TextField } from "@mui/material";
import { SquareMinus, SquarePlus } from "lucide-react";
import type React from "react";
import DynamicButton from "@/components/button/DynamicButton";
import { useCanvasContext } from "@/contexts";
import { usePalette } from "@/hooks";
import { rgbaToCssColor } from "@/util/color";
import type { SearchFilterMode } from "./ComplexSearchTab";

const SelectedColorChips = styled("div")`
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
`;

const ListItem = styled("li")`
  gap: 0.5rem;
`;

const ColorPreview = styled("div")`
  background-color: currentColor;
  border-radius: calc(infinity * 1px);
  border: var(--card-border);
  height: 1em;
  width: 1em;
`;

const ChipColorPreview = styled(ColorPreview)`
  font-size: 14px;
  margin-inline: -3px 4px;
`;

const Code = styled("code")`
  display: inline;
  font-size: 0.875em;
  opacity: 55%;
`;

const ColorSelectBlock = styled("fieldset")`
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

function sortPalette(palette: Palette) {
  return palette.toSorted((a, b) =>
    a.global === b.global ? 0
    : a.global ? -1
    : 1,
  );
}

export default function ComplexSearchColorSelect({
  value,
  filterMode,
  onChange,
  onFilterModeChange,
  disabled,
}: ComplexSearchColorSelectProps) {
  const { canvas } = useCanvasContext();
  const { data: palette = [] } = usePalette(
    canvas.eventId ?? undefined,
    false,
    {
      select: sortPalette,
    },
  );

  const paletteById = Object.fromEntries(
    palette.map((color) => [color.id, color]),
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
        options={palette}
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
        renderOption={(props, option) => (
          <ListItem {...props} key={props.key ?? option.id}>
            <ColorPreview
              aria-hidden
              style={{ color: rgbaToCssColor(option.rgba) }}
            />
            <Code>{option.code}</Code> {option.name}
          </ListItem>
        )}
        isOptionEqualToValue={(option, value) => option.id === value.id}
        renderValue={(
          values: Palette[number][],
          getItemProps: (args: { index: number }) => Record<string, unknown>,
        ) => (
          <SelectedColorChips>
            {values.map((color, index) => {
              const itemProps = getItemProps({ index });
              const { key: _key, ...restProps } = itemProps;
              return (
                <Chip
                  key={color.id}
                  {...restProps}
                  label={
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <ChipColorPreview
                        style={{ color: rgbaToCssColor(color.rgba) }}
                      />
                      {color.name}
                    </div>
                  }
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
