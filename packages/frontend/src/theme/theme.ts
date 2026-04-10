"use client";

import { createTheme } from "@mui/material";

/*
 * CSS variables are defined in ../styles/core.css
 */

export const Theme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#5865F2", // Blurple
    },
    secondary: {
      main: "#EB459E", // Fuchsia
    },
    success: {
      main: "#57F287", // Green
    },
    error: {
      main: "#ED4245", // Red
    },
    warning: {
      main: "#FEE75C", // Yellow
    },
    info: {
      main: "#5865F2", // Blurple
    },
    background: {
      paper: "var(--discord-legacy-not-quite-black)",
    },
  },
  typography: {
    fontFamily: "var(--font-body)",
  },
  components: {
    MuiCard: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          borderRadius: "0.75rem",
          border: "0.125rem solid var(--discord-legacy-dark-but-not-black)",
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableRipple: true,
      },
      styleOverrides: {
        root: {
          borderRadius: ".5rem",
          fontSize: "1rem",
          fontWeight: 500,
          letterSpacing: "0.005em",
          textTransform: "none",
          userSelect: "none",

          "&.Mui-disabled": {
            backgroundColor: "var(--discord-legacy-greyple)",
            opacity: 0.55,
            color: "var(--discord-legacy-full-white)",
          },
        },
      },
    },
  },
});
