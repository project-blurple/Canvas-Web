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
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(str);
    return;
  }
}
