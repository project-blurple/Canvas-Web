import {
  Autocomplete as MuiAutocomplete,
  Input as MuiInput,
  styled,
} from "@mui/material";

export const Input = styled(MuiInput)`
  border: oklch(from var(--discord-white) l c h / 12%) 3px solid;
  border-radius: 0.5rem;
  padding: 0.25rem 0.75rem;
  transition-duration: var(--transition-duration-fast);
  transition-property: background-color, border-color, color;
  transition-timing-function: ease, ease, ease, ease, var(--ease-out-quad);

  &::after,
  &::before {
    border-bottom: none !important;
  }

  &:hover,
  &:focus-visible,
  &.Mui-focused {
    border-color: oklch(from var(--discord-white) l c h / 36%);
  }

  &:active {
    border-color: oklch(from var(--discord-white) l c h / 72%);
  }
`;

export const AutocompleteInput = styled(MuiAutocomplete)`
  & .MuiInputBase-root {
    border: oklch(from var(--discord-white) l c h / 12%) 3px solid;
    border-radius: 0.5rem;
    padding: 0.25rem 0.75rem;
    transition-duration: var(--transition-duration-fast);
    transition-property: background-color, border-color, color, scale;
    transition-timing-function: ease, ease, ease, ease, var(--ease-out-quad);
  }

  & .MuiInputBase-root::before,
  & .MuiInputBase-root::after {
    border-bottom: none !important;
  }

  & .MuiInputBase-root:hover,
  & .MuiInputBase-root:focus-visible,
  & .MuiInputBase-root.Mui-focused {
    border-color: oklch(from var(--discord-white) l c h / 36%);
  }

  & .MuiInputBase-root:active {
    border-color: oklch(from var(--discord-white) l c h / 72%);
  }
` as typeof MuiAutocomplete;
