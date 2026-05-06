import type {
  DiscordUserProfile,
  Frame,
  GuildData,
  PixelColor,
} from "@blurple-canvas-web/types";
import { DateTime } from "luxon";

export { default as createPixelUrl } from "./searchParams";

export const CANVAS_WRAPPER_CLASS_NAME = "canvas-wrapper";

export interface ViewBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

/**
 * Return the value clamped so that it is within the range [min, max].
 */
export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function getOrdinalSuffix(rank: number) {
  const trailingDigits = rank % 100;
  if (11 <= trailingDigits && trailingDigits <= 13) {
    return "th";
  }
  switch (rank % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

export function formatTimestamp(timestamp: string, utc = true) {
  const date = new Date(timestamp);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return dateToString(date, utc);
}

export function formatTimestampLocalTZ(timestamp: string) {
  return formatTimestamp(timestamp, false);
}

function dateToString(date: Date, utc?: boolean) {
  let luxonDate = DateTime.fromJSDate(date);
  let format = DateTime.DATETIME_FULL;
  if (utc) {
    luxonDate = luxonDate.toUTC();
  } else {
    format = { ...format, timeZoneName: undefined };
  }
  return luxonDate.toLocaleString(format);
}

export function getUserGuildIds(user: DiscordUserProfile) {
  return Object.keys(getUserGuildFlags(user));
}

function getUserGuildFlags(
  user: DiscordUserProfile,
): Record<string, GuildData> {
  return user.guilds ?? {};
}

export function normalizeFrameBounds({ x0, x1, y0, y1 }: Frame): ViewBounds {
  const left = Math.min(x0, x1);
  const right = Math.max(x0, x1);
  const top = Math.min(y0, y1);
  const bottom = Math.max(y0, y1);

  return {
    left,
    right,
    top,
    bottom,
    width: right - left,
    height: bottom - top,
  };
}

export function hexStringToPixelColor(hex: string | null): PixelColor | null {
  if (hex === null) {
    return null;
  }

  if (!/^#?([0-9A-Fa-f]{6})$/.test(hex)) {
    return null;
  }

  const r = Number.parseInt(hex.slice(-6, -4), 16);
  const g = Number.parseInt(hex.slice(-4, -2), 16);
  const b = Number.parseInt(hex.slice(-2, 0), 16);
  return [r, g, b, 255];
}

export async function copyToClipboard(str: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(str);
      return;
    }
  } catch {
    // Fall through to the legacy copy path below.
  }

  if (typeof document === "undefined") {
    throw new Error("Clipboard API is unavailable.");
  }

  const textarea = document.createElement("textarea");
  textarea.value = str;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.top = "0";
  textarea.style.left = "0";
  textarea.style.opacity = "0";

  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  // Legacy clipboard fallback: MDN documents execCommand('copy') as a compatibility path.
  // Source: https://developer.mozilla.org/en-US/docs/Web/API/Document/execCommand
  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);

  if (!copied) {
    throw new Error("Copy to clipboard failed.");
  }
}
