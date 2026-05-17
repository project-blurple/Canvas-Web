"use client";

import { ThemeProvider } from "@mui/material";
import { AdapterLuxon } from "@mui/x-date-pickers/AdapterLuxon";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { Theme } from "@/theme";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme={Theme}>
      <LocalizationProvider dateAdapter={AdapterLuxon}>
        {children}
      </LocalizationProvider>
    </ThemeProvider>
  );
}
